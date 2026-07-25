'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { HeartPulse, Mic, Volume2, Square, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type ChatBubbleProps = {
  role: 'agent' | 'user'
  content: string
  /** True when the user message came from voice rather than typing. */
  spoken?: boolean
}

export function ChatBubble({ role, content, spoken = false }: ChatBubbleProps) {
  const isAgent = role === 'agent'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={cn('flex items-end gap-2', isAgent ? 'justify-start' : 'justify-end')}
    >
      {isAgent && (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <HeartPulse className="size-4" aria-hidden="true" />
        </span>
      )}

      <div
        className={cn(
          'flex max-w-[80%] flex-col gap-1 rounded-2xl px-4 py-3 shadow-sm',
          isAgent
            ? 'rounded-bl-md bg-sky-50 text-slate-800'
            : 'rounded-br-md border border-border bg-card text-card-foreground',
        )}
      >
        <p dir="auto" className="whitespace-pre-line text-[15px] leading-relaxed">
          {content}
        </p>
        <div className="flex items-center gap-2 self-end">
          {spoken && !isAgent && (
            <Mic className="size-3 text-muted-foreground" aria-label="Spoken message" />
          )}
          {isAgent && <SpeakButton text={content} />}
        </div>
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
