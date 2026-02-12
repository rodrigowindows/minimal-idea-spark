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
  if (args.some((a) => typeof a === 'string' && i18nextSponsorPattern.test(a))) return
  if (typeof orig === 'function') orig.apply(console, args)
}
console.log = silenceLocize(console.log)
console.info = silenceLocize(console.info)
console.warn = silenceLocize(console.warn)

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

// Note: No need to restore original consoles as silencing should persist for 3rd party libs


export default i18n
