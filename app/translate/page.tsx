'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Info, Loader2, Square, Stethoscope, Volume2 } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { MicButton } from '@/components/MicButton'
import { ConfidenceTag, type Confidence } from '@/components/ConfidenceTag'

// "This is a translation aid, not a replacement for a qualified interpreter."
// — shown persistently in the patient's own language, keyed by language code.
const INTERPRETER_NOTE: Record<string, string> = {
  en: 'This is a translation aid, not a replacement for a qualified interpreter.',
  ar: 'هذه أداة مساعدة للترجمة، وليست بديلاً عن مترجم مؤهل.',
  bn: 'এটি একটি অনুবাদ সহায়ক, যোগ্য দোভাষীর বিকল্প নয়।',
  zh: '这是一个翻译辅助工具，不能代替合格的口译员。',
  fr: "Ceci est une aide à la traduction, pas un remplacement d'un interprète qualifié.",
  gu: 'આ એક અનુવાદ સહાય છે, લાયક દુભાષિયાનો વિકલ્પ નથી.',
  hi: 'यह एक अनुवाद सहायता है, योग्य दुभाषिये का विकल्प नहीं।',
  fa: 'این یک ابزار کمکی ترجمه است، نه جایگزین مترجم شفاهی متخصص.',
  pl: 'To pomoc w tłumaczeniu, a nie zastępstwo wykwalifikowanego tłumacza.',
  pt: 'Isto é um auxílio de tradução, não um substituto para um intérprete qualificado.',
  pa: 'ਇਹ ਅਨੁਵਾਦ ਸਹਾਇਤਾ ਹੈ, ਯੋਗ ਦੁਭਾਸ਼ੀਏ ਦਾ ਬਦਲ ਨਹੀਂ।',
  pnb: 'ایہ ترجمے دی مدد اے، ماہر ترجمان دا بدل نہیں۔',
  ro: 'Acesta este un ajutor de traducere, nu un înlocuitor pentru un interpret calificat.',
  so: 'Kani waa qalab tarjumaad kaa caawiya, mana aha beddelka turjubaan xirfad leh.',
  es: 'Esto es una ayuda de traducción, no un sustituto de un intérprete cualificado.',
  tr: 'Bu bir çeviri yardımcısıdır, nitelikli bir tercümanın yerini tutmaz.',
  uk: 'Це допоміжний засіб перекладу, а не заміна кваліфікованого перекладача.',
  ur: 'یہ ترجمے میں مدد کا ذریعہ ہے، ماہر مترجم کا متبادل نہیں۔',
}

type Exchange = {
  id: string
  original: string
  english?: string
  confidence?: Confidence
  status: 'translating' | 'done' | 'error'
}

let nextId = 0
function makeId() {
  nextId += 1
  return `exchange-${nextId}`
}

// Live "at your appointment" translator: patient speaks in their language,
// the English translation appears large enough to show the GP directly.
// Deliberately a direct transcribe→translate pipeline — no agent loop.
export default function TranslatePage() {
  const router = useRouter()
  const { language, ready } = useLanguage()
  const [exchanges, setExchanges] = useState<Exchange[]>([])
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ready && !language) router.replace('/')
  }, [ready, language, router])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [exchanges])

  async function handleTranscript(text: string) {
    if (!language) return
    setError(null)
    const id = makeId()
    setExchanges((current) => [...current, { id, original: text, status: 'translating' }])

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, sourceLanguage: language.name }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.translatedText) {
        throw new Error(data?.error ?? 'Translation failed')
      }
      setExchanges((current) =>
        current.map((exchange) =>
          exchange.id === id
            ? {
                ...exchange,
                english: data.translatedText,
                confidence: data.confidence as Confidence,
                status: 'done',
              }
            : exchange,
        ),
      )
    } catch {
      setExchanges((current) =>
        current.map((exchange) =>
          exchange.id === id ? { ...exchange, status: 'error' } : exchange,
        ),
      )
    }
  }

  if (!language) return null

  const note = INTERPRETER_NOTE[language.code] ?? INTERPRETER_NOTE.en
  const translating = exchanges.some((exchange) => exchange.status === 'translating')

  return (
    <div className="flex h-dvh justify-center bg-background">
      <div className="flex w-full max-w-md flex-col">
        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 border-b border-border bg-background px-4 py-3">
          <Link
            href="/chat"
            aria-label="Back to chat"
            className="flex size-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-primary active:scale-95"
          >
            <ArrowLeft className="size-4.5" aria-hidden="true" />
          </Link>
          <div className="flex items-center gap-2">
            <Stethoscope className="size-5 text-primary" aria-hidden="true" />
            <h1 className="text-[15px] font-semibold text-foreground">Talk to your doctor</h1>
          </div>
        </div>

        {/* Persistent interpreter disclaimer, in the patient's language */}
        <div className="z-20 flex shrink-0 items-center justify-center gap-1.5 border-b border-sky-100 bg-sky-50/95 px-3 py-1.5 backdrop-blur">
          <Info className="size-3.5 shrink-0 text-sky-600" aria-hidden="true" />
          <p dir="auto" className="text-[11px] font-medium text-sky-800">
            {note}
          </p>
        </div>

        {/* Running list of exchanges */}
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
          {exchanges.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <p dir="auto" className="text-lg font-medium text-foreground">
                {language.nativeName}
              </p>
              <p className="max-w-[28ch] text-sm text-muted-foreground">
                Tap the microphone, speak in your language, and show your doctor the English
                translation.
              </p>
            </div>
          )}

          {exchanges.map((exchange) => (
            <motion.div
              key={exchange.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <p dir="auto" className="text-sm leading-relaxed text-muted-foreground">
                {exchange.original}
              </p>
              <div className="border-t border-border" />

              {exchange.status === 'translating' && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Translating…
                </p>
              )}
              {exchange.status === 'error' && (
                <p className="text-sm text-red-600">
                  ⚠️ Translation failed. Please try recording again.
                </p>
              )}
              {exchange.status === 'done' && exchange.english && (
                <div className="space-y-3">
                  {/* Large enough to angle the phone toward the doctor */}
                  <p className="text-2xl font-semibold leading-snug text-slate-900">
                    {exchange.english}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {exchange.confidence && <ConfidenceTag confidence={exchange.confidence} />}
                    <ReadAloudButton text={exchange.english} />
                  </div>
                </div>
              )}
            </motion.div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Record dock */}
        <div className="shrink-0 space-y-2 border-t border-border bg-background/95 px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-4 backdrop-blur">
          <div className="flex justify-center">
            <MicButton
              languageCode={language.sttCode ?? language.code}
              onTranscript={handleTranscript}
              onError={(message) => setError(message)}
              disabled={translating}
            />
          </div>
          {error && (
            <p className="text-center text-xs text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// "🔊 Read aloud in English" — plays the translation through the existing
// /api/speak (ElevenLabs TTS) route so the doctor can hear it too.
function ReadAloudButton({ text }: { text: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'playing'>('idle')
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    return () => stopAudio()
  }, [])

  function stopAudio() {
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      URL.revokeObjectURL(audio.src)
      audioRef.current = null
    }
  }

  async function handleClick() {
    if (state !== 'idle') {
      stopAudio()
      setState('idle')
      return
    }
    setState('loading')
    try {
      const response = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!response.ok) throw new Error('Speech request failed')
      const blob = await response.blob()
      const audio = new Audio(URL.createObjectURL(blob))
      audioRef.current = audio
      audio.onended = () => {
        stopAudio()
        setState('idle')
      }
      audio.onerror = () => {
        stopAudio()
        setState('idle')
      }
      await audio.play()
      setState('playing')
    } catch {
      stopAudio()
      setState('idle')
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 transition-colors hover:bg-sky-100 active:scale-95"
    >
      {state === 'idle' && <Volume2 className="size-3.5" aria-hidden="true" />}
      {state === 'loading' && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
      {state === 'playing' && <Square className="size-3 fill-current" aria-hidden="true" />}
      {state === 'playing' ? 'Stop' : 'Read aloud in English'}
    </button>
  )
}
