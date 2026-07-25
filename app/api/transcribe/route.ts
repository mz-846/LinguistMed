import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ELEVENLABS_API_KEY must be set.' }, { status: 500 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Expected multipart form data.' }, { status: 400 })
  }

  const audio = formData.get('audio')
  if (!(audio instanceof File)) {
    return NextResponse.json({ error: 'An "audio" file field is required.' }, { status: 400 })
  }
  const languageCode = formData.get('languageCode')

  try {
    const upstream = new FormData()
    upstream.append('file', audio, audio.name || 'recording.webm')
    upstream.append('model_id', 'scribe_v1')
    if (typeof languageCode === 'string' && languageCode) {
      upstream.append('language_code', languageCode)
    }

    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: { 'xi-api-key': apiKey },
      body: upstream,
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      console.error('ElevenLabs STT failed:', response.status, detail)
      return NextResponse.json({ error: 'Failed to transcribe audio.' }, { status: 502 })
    }

    const data = await response.json()
    return NextResponse.json({ text: data.text ?? '' })
  } catch (error) {
    console.error('transcribe failed:', error)
    return NextResponse.json({ error: 'Failed to transcribe audio.' }, { status: 500 })
  }
}
