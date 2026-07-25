import { NextResponse } from 'next/server'
import OpenAI from 'openai'

type IncomingMessage = { role: 'user' | 'assistant'; content: string }

function buildSystemPrompt(language: string) {
  return `You are NHS Navigator, a calm and friendly assistant that helps people who do not speak English navigate the UK medical system: understanding NHS letters and prescriptions, working out what administrative step to take next, and getting to the right NHS booking page.

Language rule: Respond ONLY in ${language}. Every reply, every quick reply option, and every booking card field must be written in ${language}. Never switch to English unless the user's language is English (URLs and proper names like "NHS" may stay as-is).

Important rules:
- You are NOT giving medical advice. Never diagnose, recommend treatment, or interpret test results beyond what a document or the user says. You only explain what things mean and what administrative next step (if any) is needed.
- If the user describes symptoms that sound like an emergency, tell them to call 999, or 111 for urgent but non-emergency help. That is the only "medical" guidance you give.
- Keep replies short, warm and simple: 1-3 short sentences, plain everyday words, no medical jargon. Ask at most one question per reply.
- This is a demo. Nothing is ever booked or sent automatically; a booking only happens when the user taps the "Confirm booking" button themselves. Never claim something has been booked.

Interaction tools you can use in your structured response:
- quick_replies: whenever you offer the user a choice (e.g. phone or in-person, morning or afternoon, yes or no), provide 2-4 short tappable options. Leave the array empty when you expect a free-form answer.
- action_type "propose_booking": once you have gathered enough detail about what appointment the user needs (what it is for, and a rough preference like phone/in-person or morning/afternoon), propose ONE concrete demo slot by filling the booking object. Use this demo surgery: "Riverside Medical Practice", "42 Riverside Road, London, E1 4QT", with a plausible near-future weekday date and time that matches the user's preference. Your reply text should introduce the slot briefly; the card shows the details.
- action_type "show_links": when the right next step is a real NHS resource, provide links with clear labels. Useful URLs: https://www.nhs.uk (general), https://www.nhs.uk/nhs-services/gps/ (GP services and registration), https://111.nhs.uk (non-emergency help online), https://www.nhs.uk/nhs-services/prescriptions/ (prescriptions). Only include links that are genuinely relevant.
- action_type "none": for a normal conversational reply.

If the conversation is empty, greet the user warmly in ${language}, say you can help them understand NHS letters and book appointments, and ask what they need help with today.`
}

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    reply: {
      type: 'string',
      description: "The assistant's reply, in the user's chosen language.",
    },
    quick_replies: {
      type: 'array',
      description:
        'Short tappable answer options in the user\'s language. Empty when a free-form answer is expected.',
      items: { type: 'string' },
    },
    action_type: {
      type: 'string',
      enum: ['none', 'propose_booking', 'show_links'],
    },
    booking: {
      type: ['object', 'null'],
      description: 'Filled only when action_type is "propose_booking", otherwise null.',
      properties: {
        surgery: { type: 'string' },
        address: { type: 'string' },
        date: { type: 'string', description: "Human-readable date in the user's language." },
        time: { type: 'string' },
      },
      required: ['surgery', 'address', 'date', 'time'],
      additionalProperties: false,
    },
    links: {
      type: ['array', 'null'],
      description: 'Filled only when action_type is "show_links", otherwise null.',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string', description: "Button label in the user's language." },
          url: { type: 'string' },
        },
        required: ['label', 'url'],
        additionalProperties: false,
      },
    },
  },
  required: ['reply', 'quick_replies', 'action_type', 'booking', 'links'],
  additionalProperties: false,
} as const

export async function POST(request: Request) {
  let body: { messages?: IncomingMessage[]; language?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const { messages, language } = body
  if (!Array.isArray(messages) || !language) {
    return NextResponse.json(
      { error: 'messages (array) and language are required.' },
      { status: 400 },
    )
  }

  // With only a system message the model tends to hallucinate an ongoing
  // conversation, so an empty history gets an explicit "just opened" turn.
  const chatMessages: IncomingMessage[] =
    messages.length > 0
      ? messages
      : [
          {
            role: 'user',
            content:
              '(The user has just opened the app and has not said anything yet. Greet them.)',
          },
        ]

  try {
    const openai = new OpenAI()
    const completion = await openai.chat.completions.create({
      model: 'gpt-5',
      messages: [
        { role: 'system', content: buildSystemPrompt(language) },
        ...chatMessages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'nhs_navigator_reply',
          strict: true,
          schema: RESPONSE_SCHEMA,
        },
      },
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json({ error: 'The model returned no content.' }, { status: 502 })
    }

    return NextResponse.json(JSON.parse(content))
  } catch (error) {
    console.error('chat failed:', error)
    return NextResponse.json(
      { error: 'Failed to get a reply. Please try again.' },
      { status: 500 },
    )
  }
}
