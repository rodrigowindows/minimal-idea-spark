/**
 * Backup: export all app data from Supabase to JSON (and CSV for opportunities/journal).
 * Used by Settings "Backup e exportação" and ExportModal. Restore via restore.ts.
 */
import { supabase } from '@/integrations/supabase/client'

export interface BackupPayload {
  version: number
  exportedAt: string
  source: 'supabase'
  data: Record<string, unknown>
}

export interface BackupSummary {
  opportunities: number
  journal: number
  habits: number
  goals: number
  domains: number
  calendarEvents: number
  priorities: number
  weeklyTargets: number
  weeklyReviews: number
  totalKeys: number
}

/** Fetch all user data from Supabase and build a backup payload */
export async function generateBackupFromSupabase(): Promise<BackupPayload> {
  const data: Record<string, unknown> = {}

  const tables = [
    'opportunities',
    'daily_logs',
    'habits',
    'habit_completions',
    'goals',
    'life_domains',
    'calendar_events',
    'user_priorities',
    'weekly_targets',
    'weekly_reviews',
    'xp_summaries',
    'chat_history',
    'knowledge_base',
    'search_history',
  ] as const

  const results = await Promise.allSettled(
    tables.map(async (table) => {
      const { data: rows } = await (supabase as any).from(table).select('*')
      return { table, rows: rows ?? [] }
    })
  )

  for (const result of results) {
    if (result.status === 'fulfilled') {
      data[result.value.table] = result.value.rows
    }
  }

  // Also include localStorage settings
  const settingsKeys = [
    'lifeos_notification_preferences',
    'lifeos_reminders_enabled',
    'lifeos_session_timeout_min',
    'lifeos_theme',
    'lifeos_language',
    'lifeos_warroom_layout',
    'lifeos_sidebar_sections',
    'lifeos_sidebar_favorites',
  ]
  for (const key of settingsKeys) {
    try {
      const raw = localStorage.getItem(key)
      if (raw) data[`settings:${key}`] = JSON.parse(raw)
    } catch {
      const raw = localStorage.getItem(key)
      if (raw) data[`settings:${key}`] = raw
    }
  }

  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    source: 'supabase',
    data,
  }
}

/** Build a summary of what's in a backup payload */
export function getBackupSummary(payload: BackupPayload): BackupSummary {
  const count = (key: string): number => {
    const val = payload.data[key]
    return Array.isArray(val) ? val.length : val ? 1 : 0
  }
  return {
    opportunities: count('opportunities'),
    journal: count('daily_logs'),
    habits: count('habits'),
    goals: count('goals'),
    domains: count('life_domains'),
    calendarEvents: count('calendar_events'),
    priorities: count('user_priorities'),
    weeklyTargets: count('weekly_targets'),
    weeklyReviews: count('weekly_reviews'),
    totalKeys: Object.keys(payload.data).length,
  }
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

export function exportOpportunitiesToCsv(opportunities: OpportunityCsvRow[]): string {
  const headers = ['title', 'status', 'type', 'priority', 'strategic_value', 'domain_id', 'description', 'due_date', 'created_at']
  const rows = opportunities.map((o) =>
    headers.map((h) => String((o as unknown as Record<string, unknown>)[h] ?? ''))
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

export function exportJournalToCsv(entries: JournalCsvRow[]): string {
  const headers = ['content', 'mood', 'energy_level', 'log_date', 'created_at']
  const rows = entries.map((e) =>
    headers.map((h) => String((e as unknown as Record<string, unknown>)[h] ?? ''))
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

export async function downloadJson() {
  const payload = await generateBackupFromSupabase()
  const json = JSON.stringify(payload, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  downloadBlob(blob, `lifeos-backup-${new Date().toISOString().slice(0, 10)}.json`)
}

export async function downloadOpportunitiesCsv() {
  const { data } = await (supabase as any).from('opportunities').select('*')
  if (!data || data.length === 0) return
  const csv = exportOpportunitiesToCsv(data as OpportunityCsvRow[])
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, `lifeos-opportunities-${new Date().toISOString().slice(0, 10)}.csv`)
}

export async function downloadJournalCsv() {
  const { data } = await (supabase as any).from('daily_logs').select('*')
  if (!data || data.length === 0) return
  const csv = exportJournalToCsv(data as JournalCsvRow[])
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
