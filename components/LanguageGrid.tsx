'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Check } from 'lucide-react'
import { LANGUAGES, type Language } from '@/context/LanguageContext'
import { cn } from '@/lib/utils'

type LanguageGridProps = {
  selected: Language | null
  onSelect: (language: Language) => void
}

export function LanguageGrid({ selected, onSelect }: LanguageGridProps) {
  const [query, setQuery] = useState('')

  const normalized = query.trim().toLowerCase()
  const filtered = normalized
    ? LANGUAGES.filter(
        (lang) =>
          lang.name.toLowerCase().includes(normalized) ||
          lang.nativeName.toLowerCase().includes(normalized),
      )
    : LANGUAGES

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search languages…"
          aria-label="Search languages"
          className="w-full rounded-2xl border border-border bg-card py-3 pl-11 pr-4 text-base text-card-foreground shadow-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {filtered.map((lang, index) => {
          const isSelected = selected?.code === lang.code
          return (
            <motion.button
              key={lang.code}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.3) }}
              onClick={() => onSelect(lang)}
              aria-pressed={isSelected}
              className={cn(
                'relative flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-2xl border bg-card px-3 py-4 shadow-sm transition-all active:scale-[0.97]',
                isSelected
                  ? 'border-primary ring-2 ring-primary/30'
                  : 'border-border hover:border-primary/40',
              )}
            >
              {isSelected && (
                <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-3" aria-hidden="true" />
                </span>
              )}
              <span className="text-2xl" aria-hidden="true">
                {lang.flag}
              </span>
              <span dir="auto" className="text-base font-bold text-card-foreground">
                {lang.nativeName}
              </span>
              {lang.nativeName !== lang.name && (
                <span className="text-xs text-muted-foreground">{lang.name}</span>
              )}
            </motion.button>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No languages match &ldquo;{query}&rdquo;.
        </p>
      )}
    </div>
  )
}
