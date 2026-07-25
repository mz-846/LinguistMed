'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

export type Language = {
  /** ISO 639-1 code, used as the ElevenLabs STT language hint. */
  code: string
  /** English name, interpolated into OpenAI prompts ("Respond only in {name}"). */
  name: string
  /** Name in the language itself, shown on the tile. */
  nativeName: string
  flag: string
  rtl?: boolean
}

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇪🇬', rtl: true },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', flag: '🇮🇷', rtl: true },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', flag: '🇷🇴' },
  { code: 'so', name: 'Somali', nativeName: 'Soomaali', flag: '🇸🇴' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰', rtl: true },
]

const STORAGE_KEY = 'nhs-navigator-language'

type LanguageContextValue = {
  language: Language | null
  /** False until the stored language has been restored, so pages can
   *  distinguish "no language chosen" from "not loaded yet". */
  ready: boolean
  setLanguage: (language: Language) => void
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language | null>(null)
  const [ready, setReady] = useState(false)

  // Restore a previously chosen language so a page refresh on /chat
  // doesn't lose it.
  useEffect(() => {
    const storedCode = window.localStorage.getItem(STORAGE_KEY)
    if (storedCode) {
      const stored = LANGUAGES.find((lang) => lang.code === storedCode)
      if (stored) setLanguageState(stored)
    }
    setReady(true)
  }, [])

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next)
    window.localStorage.setItem(STORAGE_KEY, next.code)
  }, [])

  return (
    <LanguageContext.Provider value={{ language, ready, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used inside a <LanguageProvider>.')
  }
  return context
}
