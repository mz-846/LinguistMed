import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { logAudit } from '@/lib/audit'

const SYSTEM_PROMPT = `You are an assistant that helps a non-English speaker understand an NHS letter or prescription.

Important rules:
- You are NOT giving medical advice. Never diagnose, recommend treatment, or interpret results beyond what the document itself says.
- Only explain what the document says, in simple everyday words, and what administrative next step (if any) is needed — for example attending an appointment, calling a phone number, collecting a prescription, or rearranging a booking.
- Read the document in the image, extract its text, translate it into the requested target language, and explain it in plain language a person with no medical background can understand.
- Set is_urgent to true if the letter uses words like "urgent" or "as soon as possible" (or clearly equivalent urgent wording). Otherwise set it to false.
- Honestly self-assess translation_confidence: "high" when the document is clearly legible and the translation is unambiguous, "medium" when parts are hard to read or ambiguous, "low" when much of the document is illegible or the meaning is uncertain.`

const LETTER_SCHEMA = {
  type: 'object',
  properties: {
    extracted_text: {
      type: 'string',
      description: 'The full text of the document, transcribed exactly as written.',
    },
    translated_text: {
      type: 'string',
      description: 'The extracted text translated into the target language.',
    },
    plain_explanation: {
      type: 'string',
      description:
        'A short, plain-language explanation of what the document says, in the target language.',
    },
    next_step_summary: {
      type: 'string',
      description:
        'The administrative next step the reader needs to take (if any), in the target language.',
    },
    is_urgent: {
      type: 'boolean',
      description:
        'True if the letter uses words like "urgent" or "as soon as possible".',
    },
    translation_confidence: {
      type: 'string',
      enum: ['high', 'medium', 'low'],
      description:
        'Self-assessed confidence in the extraction and translation, so the reader knows when to double-check with a human.',
    },
  },
  required: [
    'extracted_text',
    'translated_text',
    'plain_explanation',
    'next_step_summary',
    'is_urgent',
    'translation_confidence',
  ],
  additionalProperties: false,
} as const

export async function POST(request: Request) {
  let body: { imageBase64?: string; mediaType?: string; targetLanguage?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const { imageBase64, mediaType, targetLanguage } = body
  if (!imageBase64 || !mediaType || !targetLanguage) {
    return NextResponse.json(
      { error: 'imageBase64, mediaType and targetLanguage are required.' },
      { status: 400 },
    )
  }

  try {
    // Reads OPENAI_API_KEY from the environment; instantiated per-request so
    // a missing key fails the request, not the build.
    const openai = new OpenAI()
    const completion = await openai.chat.completions.create({
      model: 'gpt-5',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Please read this NHS document. Translate and explain it in ${targetLanguage}.`,
            },
            {
              type: 'image_url',
              image_url: { url: `data:${mediaType};base64,${imageBase64}` },
            },
          ],
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'nhs_letter_analysis',
          strict: true,
          schema: LETTER_SCHEMA,
        },
      },
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json(
        { error: 'The model returned no content.' },
        { status: 502 },
      )
    }

    const parsed = JSON.parse(content)
    void logAudit('process_letter', {
      target_language: targetLanguage,
      is_urgent: parsed.is_urgent,
      translation_confidence: parsed.translation_confidence,
    })
    return NextResponse.json(parsed)
  } catch (error) {
    console.error('process-letter failed:', error)
    return NextResponse.json(
      { error: 'Failed to process the letter. Please try again.' },
      { status: 500 },
    )
  }
}
