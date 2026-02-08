import { createContext, useCallback, useContext, type ReactNode } from 'react'
import { useTranslation as useI18nTranslation } from 'react-i18next'
import '@/i18n'
import { isRTL } from '@/i18n'

export type Language = 'pt-BR' | 'en' | 'es'

const LANGUAGE_MAP: Record<string, Language> = {
  pt: 'pt-BR',
  'pt-BR': 'pt-BR',
  en: 'en',
  es: 'es',
}

interface LanguageContextValue {
  language: Language
  setLanguage: (lang: Language) => void
  toggleLanguage: () => void
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { i18n } = useI18nTranslation()

  const language = (LANGUAGE_MAP[i18n.language] || 'pt-BR') as Language

  const handleSetLanguage = useCallback((lang: Language) => {
    i18n.changeLanguage(lang)
    localStorage.setItem('lifeos_language', lang)
    document.documentElement.lang = lang
    document.documentElement.dir = isRTL(lang) ? 'rtl' : 'ltr'
  }, [i18n])

  const toggleLanguage = useCallback(() => {
    const langs: Language[] = ['pt-BR', 'en', 'es']
    const currentIndex = langs.indexOf(language)
    const nextLang = langs[(currentIndex + 1) % langs.length]
    handleSetLanguage(nextLang)
  }, [language, handleSetLanguage])

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

/**
 * Hook for accessing language context (language switching).
 * For translations, use `useTranslation()` from react-i18next directly,
 * or import from this file which re-exports it with the language context.
 */
export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) throw new Error('useLanguage must be used within a LanguageProvider')
  return context
}

/**
 * Backwards-compatible hook. Returns both i18next `t` function and language context.
 */
export function useTranslation() {
  const langContext = useContext(LanguageContext)
  if (langContext === undefined) throw new Error('useTranslation must be used within a LanguageProvider')
  const { t, i18n } = useI18nTranslation()
  return {
    t,
    i18n,
    language: langContext.language,
    setLanguage: langContext.setLanguage,
    toggleLanguage: langContext.toggleLanguage,
  }
}
