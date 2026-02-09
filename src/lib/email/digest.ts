/**
 * Email digest: build and send weekly/daily digest (opportunities summary, journal wins, metrics).
 * Stub: production would use Resend/SendGrid and scheduled edge function.
 */

export type DigestFrequency = 'off' | 'daily' | 'weekly'

const STORAGE_KEY = 'lifeos_digest_frequency'

export function getDigestFrequency(): DigestFrequency {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'daily' || v === 'weekly' || v === 'off') return v
  } catch { /* ignore */ }
  return 'off'
}

export function setDigestFrequency(freq: DigestFrequency): void {
  try {
    localStorage.setItem(STORAGE_KEY, freq)
  } catch { /* ignore */ }
}

export interface DigestData {
  opportunitiesCompleted: number
  opportunitiesTotal: number
  journalEntries: number
  topDomains: { name: string; count: number }[]
  period: string
}

export function buildDigestContent(data: DigestData): string {
  const lines: string[] = [
    `Your Idea Spark digest – ${data.period}`,
    '',
    `Opportunities: ${data.opportunitiesCompleted}/${data.opportunitiesTotal} completed`,
    `Journal entries: ${data.journalEntries}`,
    '',
    'Top domains:',
    ...data.topDomains.map((d) => `  ${d.name}: ${d.count}`),
  ]
  return lines.join('\n')
}
