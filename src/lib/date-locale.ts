import { ptBR, es, enUS, type Locale } from 'date-fns/locale'
import i18n from '@/i18n'

const LOCALE_MAP: Record<string, Locale> = {
  'pt-BR': ptBR,
  en: enUS,
  es: es,
}

/**
 * Returns the date-fns locale object matching the current i18n language.
 */
export function getDateLocale() {
  return LOCALE_MAP[i18n.language] || ptBR
}

/**
 * Returns the BCP-47 locale tag for Intl formatting.
 */
export function getIntlLocale(): string {
  const map: Record<string, string> = {
    'pt-BR': 'pt-BR',
    en: 'en-US',
    es: 'es-ES',
  }
  return map[i18n.language] || 'pt-BR'
}

/**
 * Format a number using the current locale.
 */
export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(getIntlLocale(), options).format(value)
}

/**
 * Format a currency value using the current locale.
 */
export function formatCurrency(value: number, currency = 'BRL'): string {
  return new Intl.NumberFormat(getIntlLocale(), {
    style: 'currency',
    currency,
  }).format(value)
}

/**
 * Format a date using the current locale via Intl.DateTimeFormat.
 */
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(getIntlLocale(), options ?? {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d)
}

/**
 * Format a relative time (e.g., "2 days ago") using the current locale.
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = d.getTime() - now.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  const rtf = new Intl.RelativeTimeFormat(getIntlLocale(), { numeric: 'auto' })

  if (Math.abs(diffDays) < 1) {
    const diffHours = Math.round(diffMs / (1000 * 60 * 60))
    if (Math.abs(diffHours) < 1) {
      const diffMinutes = Math.round(diffMs / (1000 * 60))
      return rtf.format(diffMinutes, 'minute')
    }
    return rtf.format(diffHours, 'hour')
  }
  return rtf.format(diffDays, 'day')
}
