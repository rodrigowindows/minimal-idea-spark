import { describe, it, expect } from 'vitest'
import { generateBackupJson, exportToJson, exportOpportunitiesToCsv } from './backup'

describe('backup', () => {
  it('generateBackupJson returns version and data object', () => {
    const payload = generateBackupJson()
    expect(payload.version).toBe(1)
    expect(payload.exportedAt).toBeDefined()
    expect(typeof payload.data).toBe('object')
  })

  it('exportToJson returns valid JSON string', () => {
    const json = exportToJson()
    const parsed = JSON.parse(json)
    expect(parsed.version).toBe(1)
    expect(parsed.data).toBeDefined()
  })

  it('exportOpportunitiesToCsv includes headers and rows', () => {
    const csv = exportOpportunitiesToCsv([
      { title: 'Test', status: 'doing', type: 'action', created_at: '2025-01-01' },
    ])
    expect(csv).toContain('title')
    expect(csv).toContain('Test')
  })
})
