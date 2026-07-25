'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { HeartPulse, Mic, Volume2, Square, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ConfidenceTag, type Confidence } from '@/components/ConfidenceTag'

type ChatBubbleProps = {
  role: 'agent' | 'user'
  content: string
  /** True when the user message came from voice rather than typing. */
  spoken?: boolean
  /** Model-reported translation confidence, shown as a tag under the text. */
  confidence?: Confidence
}

// Bubble layout adapted from LangUI's "Prompt Messages" component
// (github.com/CommandCodeAI/langui, MIT): avatar-side square corner on the
// bubble and an action rail sitting outside the bubble, restyled to our
// calm sky/white palette and driven by our own role/spoken/confidence props.
export function ChatBubble({ role, content, spoken = false, confidence }: ChatBubbleProps) {
  const isAgent = role === 'agent'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={cn('flex items-start gap-2', !isAgent && 'flex-row-reverse')}
    >
      {isAgent && (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <HeartPulse className="size-4" aria-hidden="true" />
        </span>
      )}

      <div
        className={cn(
          'flex max-w-[80%] flex-col gap-1.5 p-4 shadow-sm',
          isAgent
            ? 'rounded-b-xl rounded-tr-xl bg-sky-50 text-slate-800'
            : 'rounded-b-xl rounded-tl-xl border border-border bg-card text-card-foreground',
        )}
      >
        <p dir="auto" className="whitespace-pre-line text-[15px] leading-relaxed">
          {content}
        </p>
        {confidence && <ConfidenceTag confidence={confidence} />}
      </div>

      {/* Action rail beside the bubble, as in LangUI's reply rows */}
      <div className="mt-1 flex shrink-0 flex-col gap-2 text-slate-400">
        {isAgent && <SpeakButton text={content} />}
        {!isAgent && spoken && (
          <Mic className="size-3.5" aria-label="Spoken message" />
        )}
      </div>
    </motion.div>
  )
}

// Small speaker control on agent bubbles that plays the message out loud
// through the existing /api/speak (ElevenLabs TTS) route.
function SpeakButton({ text }: { text: string }) {
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
      aria-label={state === 'idle' ? 'Listen to this message' : 'Stop listening'}
      className="flex size-6 items-center justify-center rounded-full text-sky-600 transition-colors hover:bg-sky-100 active:scale-95"
    >
      {state === 'idle' && <Volume2 className="size-3.5" aria-hidden="true" />}
      {state === 'loading' && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
      {state === 'playing' && <Square className="size-3 fill-current" aria-hidden="true" />}
    </button>
  )
}
