import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import ptBR from '../locales/pt-BR.json'
import en from '../locales/en.json'
import es from '../locales/es.json'

// Migrate old 'pt' value to 'pt-BR' for existing users
const stored = localStorage.getItem('lifeos_language')
if (stored === 'pt') {
  localStorage.setItem('lifeos_language', 'pt-BR')
}

/**
 * RTL language codes. When adding RTL languages (e.g. Arabic, Hebrew),
 * add them here and the LanguageContext will auto-set `dir="rtl"`.
 */
export const RTL_LANGUAGES = new Set<string>([
  // 'ar', 'he', 'fa', 'ur' — add RTL languages here when supported
])

/**
 * Check if a language code is RTL.
 */
export function isRTL(lang: string): boolean {
  return RTL_LANGUAGES.has(lang)
}

// Silence the "i18next is maintained with support from locize.com" sponsorship message
const i18nextSponsorPattern = /locize\.com|i18next.*maintained/i
const silenceLocize = (orig: any) => (...args: unknown[]) => {
  // Check if any argument contains the sponsorship pattern
  const isSponsorMessage = args.some((a) => 
    typeof a === 'string' && i18nextSponsorPattern.test(a)
  )
  if (isSponsorMessage) return
  if (typeof orig === 'function') orig.apply(console, args)
}

// Store originals before patching
const originalLog = console.log
const originalInfo = console.info
const originalWarn = console.warn

console.log = silenceLocize(originalLog)
console.info = silenceLocize(originalInfo)
console.warn = silenceLocize(originalWarn)

// Global flag for some i18next versions
if (typeof window !== 'undefined') {
  (window as any).i18next_ignore_support_notice = true;
  (window as any).LOCIZE_IGNORE_SUPPORT_NOTICE = true;
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    debug: false,
    resources: {
      'pt-BR': { translation: ptBR },
      en: { translation: en },
      es: { translation: es },
    },
    fallbackLng: 'pt-BR',
    supportedLngs: ['pt-BR', 'en', 'es'],
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'lifeos_language',
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  })

// Re-patch after init just in case lib restored them
console.log = silenceLocize(originalLog)
console.info = silenceLocize(originalInfo)
console.warn = silenceLocize(originalWarn)



export default i18n
