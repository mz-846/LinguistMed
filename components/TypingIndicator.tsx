'use client'

import { motion } from 'framer-motion'
import { HeartPulse } from 'lucide-react'

export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex items-end gap-2"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <HeartPulse className="size-4" aria-hidden="true" />
      </span>
      <div
        className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-sky-50 px-4 py-3.5 shadow-sm"
        role="status"
        aria-label="Assistant is typing"
      >
        {[0, 1, 2].map((dot) => (
          <motion.span
            key={dot}
            className="size-2 rounded-full bg-sky-400"
            animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: dot * 0.15 }}
          />
        ))}
      </div>
    </motion.div>
  )
}
