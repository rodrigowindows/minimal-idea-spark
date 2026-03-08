import { describe, it, expect } from 'vitest'
import { exportOpportunitiesToCsv, getBackupSummary, type BackupPayload } from './backup'

describe('backup', () => {
  it('getBackupSummary counts items correctly', () => {
    const payload: BackupPayload = {
      version: 2,
      exportedAt: new Date().toISOString(),
      source: 'supabase',
      data: {
        opportunities: [{ id: '1' }, { id: '2' }],
        daily_logs: [{ id: '1' }],
        goals: [],
      },
    }
    const summary = getBackupSummary(payload)
    expect(summary.opportunities).toBe(2)
    expect(summary.journal).toBe(1)
    expect(summary.goals).toBe(0)
  })

  it('exportOpportunitiesToCsv includes headers and rows', () => {
    const csv = exportOpportunitiesToCsv([
      { title: 'Test', status: 'doing', type: 'action', created_at: '2025-01-01' },
    ])
    expect(csv).toContain('title')
    expect(csv).toContain('Test')
  })
})
