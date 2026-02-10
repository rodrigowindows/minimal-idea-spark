import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { useTranslation as useI18nTranslation } from 'react-i18next'
import { isRTL } from '@/i18n'

export type Language = 'pt-BR' | 'en' | 'es'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  toggleLanguage: () => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const SUPPORTED_LANGUAGES: Language[] = ['pt-BR', 'en', 'es']

function normalizeLanguage(lang: string): Language {
  if (lang.startsWith('pt')) return 'pt-BR'
  if (lang.startsWith('en')) return 'en'
  if (lang.startsWith('es')) return 'es'
  return 'pt-BR'
}

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const { i18n, t } = useI18nTranslation()
  const language = normalizeLanguage(i18n.resolvedLanguage || i18n.language || 'pt-BR')

  const setLanguage = (lang: Language) => {
    if (lang === language) return
    if (SUPPORTED_LANGUAGES.includes(lang)) {
      i18n.changeLanguage(lang)
    }
  }

  const toggleLanguage = () => {
    const next = language === 'pt-BR' ? 'en' : language === 'en' ? 'es' : 'pt-BR'
    i18n.changeLanguage(next)
  }

  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = isRTL(language) ? 'rtl' : 'ltr'
  }, [language])

  const value = useMemo(
    () => ({ language, setLanguage, toggleLanguage, t }),
    [language, t]
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export const useTranslation = () => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider')
  }
  return context
}

/** Alias for useTranslation -- used by Settings and other pages */
export const useLanguage = useTranslation
