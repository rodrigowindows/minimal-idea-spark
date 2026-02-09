/**
 * Backup: export all app data to JSON (and CSV for opportunities/journal).
 * Used by Settings "Backup e exportação" and ExportModal. Restore via restore.ts.
 * @see restore.ts - validateBackupFile, restoreFromPayload
 */

/** All localStorage keys that contain user data worth backing up */
const BACKUP_KEYS = [
  'lifeos_domains',
  'lifeos_opportunities',
  'lifeos_daily_logs',
  'lifeos_journal',
  'lifeos_priorities',
  'lifeos_goals',
  'lifeos_habits',
  'lifeos_weekly_targets',
  'lifeos_automations',
  'lifeos_version_snapshots',
  'lifeos_version_branches',
  'lifeos_templates',
  'minimal_idea_spark_transcription_history',
  'lifeos_tags',
  'lifeos_opportunity_tags',
  'lifeos_journal_tags',
  'lifeos_calendar_events',
  'lifeos_focus_sessions',
  'lifeos_time_blocks',
  'lifeos_assistant_threads',
  'lifeos_notification_preferences',
  'lifeos_reminders_enabled',
  'lifeos_session_timeout_min',
  'lifeos_email_digest_frequency',
  'lifeos_theme',
  'lifeos_language',
  'lifeos_warroom_layout',
  'lifeos_sidebar_sections',
  'minimal_idea_spark_xp_state',
  'lifeos_workspace_activity',
  'lifeos_workspace_members',
  'lifeos_workspaces',
  'lifeos_api_keys',
  'lifeos_webhooks',
  'lifeos_search_history',
] as const

/** Subset of keys containing settings/preferences (as opposed to user content) */
const SETTINGS_KEYS = new Set([
  'lifeos_notification_preferences',
  'lifeos_reminders_enabled',
  'lifeos_session_timeout_min',
  'lifeos_email_digest_frequency',
  'lifeos_theme',
  'lifeos_language',
  'lifeos_warroom_layout',
  'lifeos_sidebar_sections',
])

export interface BackupPayload {
  version: number
  exportedAt: string
  workspaceId?: string
  data: Record<string, unknown>
}

export interface BackupSummary {
  opportunities: number
  journal: number
  habits: number
  goals: number
  domains: number
  calendarEvents: number
  focusSessions: number
  templates: number
  tags: number
  automations: number
  settings: number
  totalKeys: number
}

export function generateBackupJson(workspaceId?: string): BackupPayload {
  const data: Record<string, unknown> = {}
  for (const key of BACKUP_KEYS) {
    try {
      const raw = localStorage.getItem(key)
      if (raw) data[key] = JSON.parse(raw)
    } catch {
      const raw = localStorage.getItem(key)
      if (raw) data[key] = raw
    }
  }
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    workspaceId,
    data,
  }
}

export function exportToJson(workspaceId?: string): string {
  const payload = generateBackupJson(workspaceId)
  return JSON.stringify(payload, null, 2)
}

/** Build a summary of what's in a backup payload */
export function getBackupSummary(payload: BackupPayload): BackupSummary {
  const count = (key: string): number => {
    const val = payload.data[key]
    return Array.isArray(val) ? val.length : val ? 1 : 0
  }
  let settingsCount = 0
  for (const key of Object.keys(payload.data)) {
    if (SETTINGS_KEYS.has(key)) settingsCount++
  }
  return {
    opportunities: count('lifeos_opportunities'),
    journal: count('lifeos_daily_logs') + count('lifeos_journal'),
    habits: count('lifeos_habits'),
    goals: count('lifeos_goals'),
    domains: count('lifeos_domains'),
    calendarEvents: count('lifeos_calendar_events'),
    focusSessions: count('lifeos_focus_sessions'),
    templates: count('lifeos_templates'),
    tags: count('lifeos_tags'),
    automations: count('lifeos_automations'),
    settings: settingsCount,
    totalKeys: Object.keys(payload.data).length,
  }
}

/** Get a summary of the current local data */
export function getCurrentDataSummary(): BackupSummary {
  return getBackupSummary(generateBackupJson())
}

// ── CSV Export ──────────────────────────────────────────────

function escapeCsv(value: unknown): string {
  const s = String(value ?? '')
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function arrayToCsv(headers: string[], rows: string[][]): string {
  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(row.map(escapeCsv).join(','))
  }
  return '\ufeff' + lines.join('\r\n')
}

export interface OpportunityCsvRow {
  title: string
  status: string
  type?: string
  priority?: number
  strategic_value?: number | null
  domain_id?: string | null
  description?: string | null
  due_date?: string | null
  created_at?: string
}

export function exportOpportunitiesToCsv(
  opportunities: OpportunityCsvRow[]
): string {
  const headers = ['title', 'status', 'type', 'priority', 'strategic_value', 'domain_id', 'description', 'due_date', 'created_at']
  const rows = opportunities.map((o) =>
    headers.map((h) => String((o as Record<string, unknown>)[h] ?? ''))
  )
  return arrayToCsv(headers, rows)
}

export interface JournalCsvRow {
  content: string
  mood?: string | null
  energy_level?: number | null
  log_date?: string
  created_at?: string
}

export function exportJournalToCsv(
  entries: JournalCsvRow[]
): string {
  const headers = ['content', 'mood', 'energy_level', 'log_date', 'created_at']
  const rows = entries.map((e) =>
    headers.map((h) => String((e as Record<string, unknown>)[h] ?? ''))
  )
  return arrayToCsv(headers, rows)
}

// ── Download helpers ────────────────────────────────────────

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadJson(workspaceId?: string) {
  const json = exportToJson(workspaceId)
  const blob = new Blob([json], { type: 'application/json' })
  downloadBlob(blob, `lifeos-backup-${new Date().toISOString().slice(0, 10)}.json`)
}

export function downloadOpportunitiesCsv() {
  const raw = localStorage.getItem('lifeos_opportunities')
  if (!raw) return
  const items = JSON.parse(raw) as OpportunityCsvRow[]
  const csv = exportOpportunitiesToCsv(items)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, `lifeos-opportunities-${new Date().toISOString().slice(0, 10)}.csv`)
}

export function downloadJournalCsv() {
  const raw = localStorage.getItem('lifeos_daily_logs')
  if (!raw) return
  const items = JSON.parse(raw) as JournalCsvRow[]
  const csv = exportJournalToCsv(items)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, `lifeos-journal-${new Date().toISOString().slice(0, 10)}.csv`)
}

// ── Scheduled Backup Reminder ──────────────────────────────

const BACKUP_SCHEDULE_KEY = 'lifeos_backup_schedule'
const LAST_BACKUP_KEY = 'lifeos_last_backup_date'

export type BackupFrequency = 'off' | 'daily' | 'weekly' | 'monthly'

export function getBackupSchedule(): BackupFrequency {
  return (localStorage.getItem(BACKUP_SCHEDULE_KEY) as BackupFrequency) || 'off'
}

export function setBackupSchedule(freq: BackupFrequency) {
  localStorage.setItem(BACKUP_SCHEDULE_KEY, freq)
}

export function getLastBackupDate(): string | null {
  return localStorage.getItem(LAST_BACKUP_KEY)
}

export function setLastBackupDate(isoDate: string) {
  localStorage.setItem(LAST_BACKUP_KEY, isoDate)
}

export function isBackupDue(): boolean {
  const freq = getBackupSchedule()
  if (freq === 'off') return false
  const last = getLastBackupDate()
  if (!last) return true
  const lastDate = new Date(last)
  const now = new Date()
  const diffMs = now.getTime() - lastDate.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  switch (freq) {
    case 'daily': return diffDays >= 1
    case 'weekly': return diffDays >= 7
    case 'monthly': return diffDays >= 30
    default: return false
  }
}
