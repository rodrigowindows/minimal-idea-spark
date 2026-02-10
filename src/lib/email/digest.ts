/**
 * Email digest: build and send weekly/daily digest (opportunities summary, journal wins, metrics).
 * Manages digest preferences in localStorage (client) and builds rich HTML digest content.
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
  opportunitiesNew: number
  journalEntries: number
  journalWins: string[]
  topDomains: { name: string; count: number; color: string }[]
  focusMinutes: number
  streakDays: number
  xpGained: number
  period: string
  periodStart: string
  periodEnd: string
}

export interface DigestPreferences {
  enabled: boolean
  frequency: DigestFrequency
  includeOpportunities: boolean
  includeJournal: boolean
  includeMetrics: boolean
  preferredTime: string // HH:MM
  preferredDay: number // 0=Sun, 1=Mon, ...6=Sat
}

const DIGEST_PREFS_KEY = 'lifeos_digest_preferences'

const DEFAULT_PREFS: DigestPreferences = {
  enabled: false,
  frequency: 'weekly',
  includeOpportunities: true,
  includeJournal: true,
  includeMetrics: true,
  preferredTime: '08:00',
  preferredDay: 1,
}

export function getDigestPreferences(): DigestPreferences {
  try {
    const stored = localStorage.getItem(DIGEST_PREFS_KEY)
    if (stored) return { ...DEFAULT_PREFS, ...JSON.parse(stored) }
  } catch { /* ignore */ }
  return DEFAULT_PREFS
}

export function setDigestPreferences(prefs: Partial<DigestPreferences>): void {
  try {
    const current = getDigestPreferences()
    const updated = { ...current, ...prefs }
    localStorage.setItem(DIGEST_PREFS_KEY, JSON.stringify(updated))
    // Keep legacy storage key in sync
    setDigestFrequency(updated.enabled ? updated.frequency : 'off')
  } catch { /* ignore */ }
}

export function buildDigestContent(data: DigestData): string {
  const lines: string[] = [
    `Your Idea Spark digest – ${data.period}`,
    '',
    `Opportunities: ${data.opportunitiesCompleted}/${data.opportunitiesTotal} completed`,
    `New opportunities: ${data.opportunitiesNew}`,
    `Journal entries: ${data.journalEntries}`,
    '',
  ]

  if (data.journalWins.length > 0) {
    lines.push('Wins & highlights:')
    data.journalWins.forEach((w) => lines.push(`  - ${w}`))
    lines.push('')
  }

  lines.push('Top domains:')
  data.topDomains.forEach((d) => lines.push(`  ${d.name}: ${d.count}`))
  lines.push('')

  if (data.focusMinutes > 0) {
    lines.push(`Deep work: ${Math.round(data.focusMinutes / 60)}h ${data.focusMinutes % 60}m`)
  }
  if (data.streakDays > 0) {
    lines.push(`Current streak: ${data.streakDays} days`)
  }
  if (data.xpGained > 0) {
    lines.push(`XP gained: +${data.xpGained}`)
  }

  return lines.join('\n')
}

export function buildDigestHtml(data: DigestData, appUrl: string): string {
  const domainRows = data.topDomains
    .map(
      (d) =>
        `<tr><td style="padding:4px 12px 4px 0"><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${d.color};margin-right:6px;vertical-align:middle"></span>${d.name}</td><td style="padding:4px 0;font-weight:600">${d.count}</td></tr>`
    )
    .join('')

  const winsHtml =
    data.journalWins.length > 0
      ? `<div style="margin:16px 0"><h3 style="color:#4f46e5;font-size:14px;margin:0 0 8px">Wins & Highlights</h3><ul style="margin:0;padding-left:20px">${data.journalWins.map((w) => `<li style="margin:4px 0;color:#374151">${w}</li>`).join('')}</ul></div>`
      : ''

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb">
<div style="max-width:600px;margin:0 auto;padding:24px">
  <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:12px;padding:24px;color:#fff;text-align:center;margin-bottom:24px">
    <h1 style="margin:0;font-size:22px">Idea Spark Digest</h1>
    <p style="margin:8px 0 0;opacity:0.9;font-size:14px">${data.period}</p>
  </div>

  <div style="background:#fff;border-radius:12px;padding:20px;margin-bottom:16px;border:1px solid #e5e7eb">
    <h2 style="font-size:16px;color:#1f2937;margin:0 0 16px">Overview</h2>
    <div style="display:flex;gap:12px;flex-wrap:wrap">
      <div style="flex:1;min-width:120px;background:#f0fdf4;border-radius:8px;padding:12px;text-align:center">
        <div style="font-size:24px;font-weight:700;color:#16a34a">${data.opportunitiesCompleted}</div>
        <div style="font-size:12px;color:#4b5563">Completed</div>
      </div>
      <div style="flex:1;min-width:120px;background:#eff6ff;border-radius:8px;padding:12px;text-align:center">
        <div style="font-size:24px;font-weight:700;color:#2563eb">${data.journalEntries}</div>
        <div style="font-size:12px;color:#4b5563">Journal Entries</div>
      </div>
      <div style="flex:1;min-width:120px;background:#faf5ff;border-radius:8px;padding:12px;text-align:center">
        <div style="font-size:24px;font-weight:700;color:#7c3aed">+${data.xpGained}</div>
        <div style="font-size:12px;color:#4b5563">XP Gained</div>
      </div>
    </div>
  </div>

  ${winsHtml ? `<div style="background:#fff;border-radius:12px;padding:20px;margin-bottom:16px;border:1px solid #e5e7eb">${winsHtml}</div>` : ''}

  <div style="background:#fff;border-radius:12px;padding:20px;margin-bottom:16px;border:1px solid #e5e7eb">
    <h2 style="font-size:16px;color:#1f2937;margin:0 0 12px">Domains</h2>
    <table style="width:100%;font-size:14px;color:#374151">${domainRows}</table>
  </div>

  <div style="background:#fff;border-radius:12px;padding:20px;margin-bottom:16px;border:1px solid #e5e7eb">
    <h2 style="font-size:16px;color:#1f2937;margin:0 0 12px">Metrics</h2>
    <div style="font-size:14px;color:#374151;line-height:1.8">
      ${data.focusMinutes > 0 ? `<div>Deep Work: <strong>${Math.round(data.focusMinutes / 60)}h ${data.focusMinutes % 60}m</strong></div>` : ''}
      ${data.streakDays > 0 ? `<div>Streak: <strong>${data.streakDays} days</strong></div>` : ''}
      <div>Total Opportunities: <strong>${data.opportunitiesTotal}</strong> (${data.opportunitiesNew} new)</div>
    </div>
  </div>

  <div style="text-align:center;padding:20px 0">
    <a href="${appUrl}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Open Idea Spark</a>
  </div>

  <div style="text-align:center;padding:16px 0;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af">
    <p>You received this because you enabled digest emails in your Idea Spark settings.</p>
    <a href="${appUrl}/settings" style="color:#6b7280">Manage preferences</a> · <a href="${appUrl}/settings" style="color:#6b7280">Unsubscribe</a>
  </div>
</div>
</body>
</html>`
}
