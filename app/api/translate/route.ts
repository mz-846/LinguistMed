import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getSupabase } from '@/lib/supabase'
import { logAudit } from '@/lib/audit'

// Direct transcribe-then-translate pipeline for the live appointment
// translator. Deliberately does NOT go through the conversational agent —
// it must stay fast enough to use mid-conversation with a GP.

const TRANSLATION_SCHEMA = {
  type: 'object',
  properties: {
    translated_text: {
      type: 'string',
      description: 'The translation of the source text, and nothing else.',
    },
    confidence: {
      type: 'string',
      enum: ['high', 'medium', 'low'],
      description:
        'Self-assessed translation confidence. high = clear source, unambiguous translation. medium = minor ambiguity or possible transcription noise. low = the source is unclear, fragmentary, or could mean several different things.',
    },
  },
  required: ['translated_text', 'confidence'],
  additionalProperties: false,
} as const

type CacheRow = {
  translated_text: string
  confidence: 'high' | 'medium' | 'low' | null
}

export async function POST(request: Request) {
  let body: {
    text?: string
    sourceLanguage?: string
    targetLanguage?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const text = body.text?.trim()
  const sourceLanguage = body.sourceLanguage?.trim()
  const targetLanguage = body.targetLanguage?.trim() || 'English'
  if (!text || !sourceLanguage) {
    return NextResponse.json(
      { error: 'text and sourceLanguage are required.' },
      { status: 400 },
    )
  }

  const sourceHash = createHash('sha256').update(text).digest('hex')

  // Cache lookup: same exact text + same target language means we can skip
  // the model call entirely. Cache failures (e.g. table not created yet)
  // must never break translation, so they only log a warning.
  try {
    const { data, error } = await getSupabase()
      .from('translation_cache')
      .select('translated_text, confidence')
      .eq('source_hash', sourceHash)
      .eq('target_language', targetLanguage)
      .maybeSingle<CacheRow>()
    if (error) {
      console.warn('translation_cache lookup failed:', error.message)
    } else if (data) {
      void logAudit('translate_speech', {
        source_language: sourceLanguage,
        target_language: targetLanguage,
        characters: text.length,
        cached: true,
      })
      return NextResponse.json({
        translatedText: data.translated_text,
        confidence: data.confidence ?? 'medium',
        cached: true,
      })
    }
  } catch (error) {
    console.warn('translation_cache lookup failed:', error)
  }

  try {
    const openai = new OpenAI()
    const completion = await openai.chat.completions.create({
      model: 'gpt-5',
      messages: [
        {
          role: 'system',
          content: `You are a medical translation specialist used during a live GP appointment. Translate the user's message from ${sourceLanguage} into ${targetLanguage}.

Rules:
- Translate ONLY the text provided. Do not add explanations, advice, or commentary.
- The source is a speech-to-text transcript, so it may contain transcription noise; translate the most plausible intended meaning.
- Maintain medical accuracy. Keep medication names and dosages exactly as stated.
- Honestly self-assess your confidence so the patient knows when to double-check with a human interpreter.`,
        },
        { role: 'user', content: text },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'medical_translation',
          strict: true,
          schema: TRANSLATION_SCHEMA,
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

    const parsed = JSON.parse(content) as {
      translated_text: string
      confidence: 'high' | 'medium' | 'low'
    }

    // Populate the cache for next time; failure is non-fatal.
    try {
      const { error } = await getSupabase().from('translation_cache').insert({
        source_hash: sourceHash,
        target_language: targetLanguage,
        source_text: text,
        translated_text: parsed.translated_text,
        confidence: parsed.confidence,
      })
      if (error) console.warn('translation_cache insert failed:', error.message)
    } catch (error) {
      console.warn('translation_cache insert failed:', error)
    }

    void logAudit('translate_speech', {
      source_language: sourceLanguage,
      target_language: targetLanguage,
      characters: text.length,
      cached: false,
      confidence: parsed.confidence,
    })

    return NextResponse.json({
      translatedText: parsed.translated_text,
      confidence: parsed.confidence,
      cached: false,
    })
  } catch (error) {
    console.error('translate failed:', error)
    return NextResponse.json(
      { error: 'Translation failed. Please try again.' },
      { status: 500 },
    )
  }
}
