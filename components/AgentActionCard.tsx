'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, CheckCircle2, XCircle, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type AgentActionStep = {
  step: string
  screenshot?: string
}

export type AgentActionStatus = 'running' | 'success' | 'failed'

type AgentActionCardProps = {
  steps: AgentActionStep[]
  status: AgentActionStatus
  error?: string | null
  /** Extra line shown under the trace, e.g. that a fallback was used. */
  note?: string | null
}

// Inline trace of the agent visibly driving a browser: a vertical list of
// steps with screenshot thumbnails (tap to enlarge). Violet accent so it is
// visually distinct from the booking (blue) and links (teal) cards.
export function AgentActionCard({ steps, status, error, note }: AgentActionCardProps) {
  const [enlarged, setEnlarged] = useState<string | null>(null)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="ml-10 max-w-[85%] space-y-3 rounded-2xl border border-violet-200 bg-violet-50/60 p-4 shadow-sm"
    >
      <div className="flex items-center gap-2">
        <Bot className="size-4 shrink-0 text-violet-700" aria-hidden="true" />
        <p className="text-xs font-bold uppercase tracking-wide text-violet-800">
          Agent using the browser
        </p>
        {status === 'running' && (
          <Loader2 className="ml-auto size-4 animate-spin text-violet-600" aria-hidden="true" />
        )}
        {status === 'success' && (
          <CheckCircle2 className="ml-auto size-4 text-emerald-600" aria-hidden="true" />
        )}
        {status === 'failed' && (
          <XCircle className="ml-auto size-4 text-destructive" aria-hidden="true" />
        )}
      </div>

      <ol className="space-y-3">
        {steps.map((step, index) => (
          <motion.li
            key={index}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: index * 0.35 }}
            className="flex flex-col gap-2"
          >
            <div className="flex items-start gap-2">
              <span
                className={cn(
                  'mt-1 flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                  'bg-violet-200 text-violet-800',
                )}
              >
                {index + 1}
              </span>
              <p className="text-sm leading-relaxed text-violet-950">{step.step}</p>
            </div>
            {step.screenshot && (
              <button
                type="button"
                onClick={() => setEnlarged(step.screenshot!)}
                aria-label="Enlarge screenshot"
                className="ml-6 w-fit overflow-hidden rounded-lg border border-violet-200 shadow-sm transition-transform active:scale-[0.98]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={step.screenshot}
                  alt={`Screenshot: ${step.step}`}
                  className="h-24 w-auto max-w-full object-cover object-top"
                />
              </button>
            )}
          </motion.li>
        ))}
      </ol>

      {status === 'running' && steps.length === 0 && (
        <p className="text-sm text-violet-700">Starting a browser…</p>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}

      {note && <p className="text-xs leading-relaxed text-violet-700">{note}</p>}

      {/* Tap-to-enlarge overlay */}
      <AnimatePresence>
        {enlarged && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setEnlarged(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            role="dialog"
            aria-label="Screenshot preview"
          >
            <button
              type="button"
              onClick={() => setEnlarged(null)}
              aria-label="Close preview"
              className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/15 text-white"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={enlarged}
              alt="Enlarged screenshot"
              className="max-h-full max-w-full rounded-xl shadow-2xl"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
