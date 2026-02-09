import type { ExportRow } from '@/lib/analytics/export'

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
] as const

export interface BackupPayload {
  version: number
  exportedAt: string
  workspaceId?: string
  data: Record<string, unknown>
}

export function generateBackupJson(workspaceId?: string): BackupPayload {
  const data: Record<string, unknown> = {}
  for (const key of BACKUP_KEYS) {
    try {
      const raw = localStorage.getItem(key)
      if (raw) data[key] = JSON.parse(raw)
    } catch {
      data[key] = null
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

export function exportOpportunitiesToCsv(opportunities: Array<{ title: string; status: string; type?: string; created_at?: string }>): string {
  const headers = ['title', 'status', 'type', 'created_at']
  const rows = opportunities.map((o) =>
    headers.map((h) => `"${String((o as Record<string, unknown>)[h] ?? '').replace(/"/g, '""')}"`).join(',')
  )
  return [headers.join(','), ...rows].join('\n')
}

export function exportJournalToCsv(entries: Array<{ content: string; mood?: string; energy?: number; created_at?: string }>): string {
  const headers = ['content', 'mood', 'energy', 'created_at']
  const rows = entries.map((e) =>
    headers.map((h) => `"${String((e as Record<string, unknown>)[h] ?? '').replace(/"/g, '""')}"`).join(',')
  )
  return [headers.join(','), ...rows].join('\n')
}
