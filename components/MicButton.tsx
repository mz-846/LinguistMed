'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Square, Loader2 } from 'lucide-react'

type MicButtonProps = {
  /** ISO language code passed to ElevenLabs STT as a hint. */
  languageCode: string
  onTranscript: (text: string) => void
  onError: (message: string) => void
  disabled?: boolean
}

type MicState = 'idle' | 'recording' | 'transcribing'

// Big thumb-reachable voice button: tap to record, tap again to stop and
// send the audio to the /api/transcribe (ElevenLabs STT) route.
export function MicButton({ languageCode, onTranscript, onError, disabled = false }: MicButtonProps) {
  const [state, setState] = useState<MicState>('idle')
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  useEffect(() => {
    return () => {
      const recorder = recorderRef.current
      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = null
        recorder.stop()
        recorder.stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      recorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop())
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        })
        await transcribe(blob)
      }

      recorder.start()
      setState('recording')
    } catch {
      onError('We could not access your microphone. Please allow microphone access, or type instead.')
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      setState('transcribing')
      recorder.stop()
    }
  }

  async function transcribe(blob: Blob) {
    try {
      const formData = new FormData()
      formData.append('audio', blob, 'recording.webm')
      formData.append('languageCode', languageCode)

      const response = await fetch('/api/transcribe', { method: 'POST', body: formData })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error ?? 'Transcription failed')
      }

      const text = (data?.text ?? '').trim()
      if (text) {
        onTranscript(text)
      } else {
        onError('We could not hear anything. Please try again, or type instead.')
      }
    } catch {
      onError('We could not understand the recording. Please try again, or type instead.')
    } finally {
      setState('idle')
    }
  }

  function handleClick() {
    if (state === 'idle') startRecording()
    else if (state === 'recording') stopRecording()
  }

  return (
    <div className="relative flex items-center justify-center">
      {/* Pulsing rings while listening */}
      <AnimatePresence>
        {state === 'recording' && (
          <>
            {[0, 0.5].map((delay) => (
              <motion.span
                key={delay}
                className="absolute size-16 rounded-full bg-primary/30"
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: 1.9, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.4, repeat: Infinity, delay, ease: 'easeOut' }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={handleClick}
        disabled={disabled || state === 'transcribing'}
        whileTap={{ scale: 0.92 }}
        aria-label={
          state === 'recording'
            ? 'Stop recording and send'
            : state === 'transcribing'
              ? 'Understanding your voice…'
              : 'Speak your message'
        }
        className="relative z-10 flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-colors disabled:opacity-70"
      >
        {state === 'idle' && <Mic className="size-7" aria-hidden="true" />}
        {state === 'recording' && <Square className="size-6 fill-current" aria-hidden="true" />}
        {state === 'transcribing' && <Loader2 className="size-7 animate-spin" aria-hidden="true" />}
      </motion.button>
    </div>
  )
}
