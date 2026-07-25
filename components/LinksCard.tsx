'use client'

import { motion } from 'framer-motion'
import { ExternalLink, Globe } from 'lucide-react'

export type LinkItem = {
  label: string
  url: string
}

type LinksCardProps = {
  links: LinkItem[]
}

// Inline card that hands the user off to real NHS resources. Uses a teal
// accent (distinct from the blue booking card) to make it visually clear
// this leaves the app — and only ever navigates on an explicit tap.
export function LinksCard({ links }: LinksCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="ml-10 max-w-[85%] space-y-2.5 rounded-2xl border border-teal-200 bg-teal-50/60 p-4 shadow-sm"
    >
      <div className="flex items-center gap-2">
        <Globe className="size-4 shrink-0 text-teal-700" aria-hidden="true" />
        <p className="text-xs font-bold uppercase tracking-wide text-teal-800">NHS websites</p>
      </div>

      <div className="flex flex-col gap-2">
        {links.map((link) => (
          <a
            key={link.url + link.label}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            dir="auto"
            className="flex items-center justify-between gap-2 rounded-xl border border-teal-300 bg-white px-4 py-3 text-sm font-bold text-teal-800 shadow-sm transition-transform active:scale-[0.98]"
          >
            <span className="min-w-0 truncate">{link.label}</span>
            <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
          </a>
        ))}
      </div>

      <p className="text-[11px] leading-relaxed text-teal-700">
        These open the official NHS website in a new tab.
      </p>
    </motion.div>
  )
}
