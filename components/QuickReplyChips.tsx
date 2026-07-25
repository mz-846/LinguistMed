'use client'

import { motion } from 'framer-motion'

type QuickReplyChipsProps = {
  options: string[]
  onSelect: (option: string) => void
  disabled?: boolean
}

// Tappable answer chips shown under an agent message when it offers choices.
export function QuickReplyChips({ options, onSelect, disabled = false }: QuickReplyChipsProps) {
  if (options.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.1 }}
      className="ml-10 flex flex-wrap gap-2"
    >
      {options.map((option) => (
        <button
          key={option}
          type="button"
          dir="auto"
          disabled={disabled}
          onClick={() => onSelect(option)}
          className="rounded-full border border-primary/30 bg-card px-4 py-2 text-sm font-semibold text-primary shadow-sm transition-all hover:bg-accent active:scale-95 disabled:opacity-50"
        >
          {option}
        </button>
      ))}
    </motion.div>
  )
}
