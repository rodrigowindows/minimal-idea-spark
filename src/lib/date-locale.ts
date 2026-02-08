import { ptBR } from 'date-fns/locale/pt-BR'
import { es } from 'date-fns/locale'
import { enUS } from 'date-fns/locale'
import i18n from '@/i18n'

const LOCALE_MAP: Record<string, Locale> = {
  'pt-BR': ptBR,
  en: enUS,
  es: es,
}

/**
 * Returns the date-fns locale object matching the current i18n language.
 */
export function getDateLocale(): Locale {
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
