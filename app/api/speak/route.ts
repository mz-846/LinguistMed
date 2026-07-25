import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  let body: { text?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const { text } = body
  if (!text) {
    return NextResponse.json({ error: 'text is required.' }, { status: 400 })
  }

  const apiKey = process.env.ELEVENLABS_API_KEY
  const voiceId = process.env.ELEVENLABS_VOICE_ID
  if (!apiKey || !voiceId) {
    return NextResponse.json(
      { error: 'ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID must be set.' },
      { status: 500 },
    )
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
        }),
      },
    )

    if (!response.ok || !response.body) {
      const detail = await response.text().catch(() => '')
      console.error('ElevenLabs TTS failed:', response.status, detail)
      return NextResponse.json(
        { error: 'Failed to generate speech.' },
        { status: 502 },
      )
    }

    return new Response(response.body, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('speak failed:', error)
    return NextResponse.json(
      { error: 'Failed to generate speech.' },
      { status: 500 },
    )
  }
}
