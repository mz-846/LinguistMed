'use client'

import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { HeartPulse, ArrowRight } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { LanguageGrid } from '@/components/LanguageGrid'

// Screen 1 — full-screen language select, shown before anything else.
export default function LanguageSelectPage() {
  const router = useRouter()
  const { language, setLanguage } = useLanguage()

  return (
    <div className="flex min-h-svh justify-center bg-background">
      <div className="flex w-full max-w-md flex-1 flex-col px-5 pb-32 pt-10">
        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-6 flex flex-col items-center gap-3 text-center"
        >
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <HeartPulse className="size-7" aria-hidden="true" />
          </span>
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              MedLingo
            </h1>
            <p className="text-pretty text-base text-muted-foreground">
              Choose the language you&rsquo;re most comfortable with.
            </p>
          </div>
        </motion.header>

        <LanguageGrid selected={language} onSelect={setLanguage} />

        <AnimatePresence>
          {language && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="fixed inset-x-0 bottom-0 z-20 flex justify-center bg-gradient-to-t from-background via-background/95 to-transparent px-5 pb-6 pt-10"
            >
              <button
                type="button"
                onClick={() => router.push('/chat')}
                className="flex w-full max-w-md items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4.5 text-lg font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-transform active:scale-[0.98]"
              >
                Continue
                <ArrowRight className="size-5" aria-hidden="true" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
