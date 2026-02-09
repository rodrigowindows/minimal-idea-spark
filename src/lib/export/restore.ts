import type { BackupPayload, BackupSummary } from './backup'
import { getBackupSummary } from './backup'

export type RestoreStrategy = 'replace' | 'merge' | 'skip'

export interface RestoreResult {
  ok: boolean
  keysRestored: string[]
  keysSkipped: string[]
  conflicts: RestoreConflict[]
  error?: string
}

export interface RestoreConflict {
  key: string
  existingCount: number
  incomingCount: number
  newItems: number
  duplicateItems: number
}

export interface ImportPreview {
  valid: boolean
  error?: string
  payload?: BackupPayload
  summary?: BackupSummary
  conflicts?: RestoreConflict[]
}

/** Validate a backup file and return a full preview of what it contains */
export function previewBackupFile(json: string): ImportPreview {
  try {
    const parsed = JSON.parse(json) as unknown
    if (!parsed || typeof parsed !== 'object' || !('version' in parsed) || !('data' in parsed)) {
      return { valid: false, error: 'Formato de backup inválido.' }
    }
    const payload = parsed as BackupPayload
    if (payload.version !== 1 || typeof payload.data !== 'object') {
      return { valid: false, error: 'Versão de backup não suportada.' }
    }
    const summary = getBackupSummary(payload)
    const conflicts = detectConflicts(payload)
    return { valid: true, payload, summary, conflicts }
  } catch {
    return { valid: false, error: 'Arquivo não é um JSON válido.' }
  }
}

/** Detect potential merge conflicts between backup and existing local data */
function detectConflicts(payload: BackupPayload): RestoreConflict[] {
  const conflicts: RestoreConflict[] = []
  for (const [key, value] of Object.entries(payload.data)) {
    if (!Array.isArray(value)) continue
    const existing = localStorage.getItem(key)
    if (!existing) continue
    try {
      const existingArr = JSON.parse(existing)
      if (!Array.isArray(existingArr)) continue
      const existingIds = new Set(existingArr.map((i: { id?: string }) => i.id).filter(Boolean))
      const incomingIds = (value as Array<{ id?: string }>).map(i => i.id).filter(Boolean)
      const duplicates = incomingIds.filter(id => existingIds.has(id!))
      const newItems = incomingIds.length - duplicates.length
      if (duplicates.length > 0 || newItems > 0) {
        conflicts.push({
          key,
          existingCount: existingArr.length,
          incomingCount: value.length,
          newItems,
          duplicateItems: duplicates.length,
        })
      }
    } catch { /* skip non-parseable */ }
  }
  return conflicts
}

export function validateBackupFile(json: string): { ok: true; payload: BackupPayload } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(json) as unknown
    if (!parsed || typeof parsed !== 'object' || !('version' in parsed) || !('data' in parsed)) {
      return { ok: false, error: 'Formato de backup inválido.' }
    }
    const payload = parsed as BackupPayload
    if (payload.version !== 1 || typeof payload.data !== 'object') {
      return { ok: false, error: 'Versão de backup não suportada.' }
    }
    return { ok: true, payload }
  } catch {
    return { ok: false, error: 'Arquivo não é um JSON válido.' }
  }
}

export function restoreFromPayload(
  payload: BackupPayload,
  strategy: RestoreStrategy = 'merge'
): RestoreResult {
  const keysRestored: string[] = []
  const keysSkipped: string[] = []
  const conflicts: RestoreConflict[] = []

  try {
    for (const [key, value] of Object.entries(payload.data)) {
      if (value === null || value === undefined) {
        keysSkipped.push(key)
        continue
      }
      const existing = localStorage.getItem(key)
      if (strategy === 'skip' && existing) {
        keysSkipped.push(key)
        continue
      }
      if (strategy === 'merge' && existing) {
        try {
          const existingParsed = JSON.parse(existing)
          if (Array.isArray(existingParsed) && Array.isArray(value)) {
            const merged = [...existingParsed]
            const ids = new Set(merged.map((i: { id?: string }) => i.id))
            let newCount = 0
            let dupCount = 0
            for (const item of value as Array<{ id?: string }>) {
              if (item.id && !ids.has(item.id)) {
                merged.push(item)
                ids.add(item.id)
                newCount++
              } else if (item.id) {
                dupCount++
              }
            }
            if (dupCount > 0) {
              conflicts.push({
                key,
                existingCount: existingParsed.length,
                incomingCount: (value as unknown[]).length,
                newItems: newCount,
                duplicateItems: dupCount,
              })
            }
            localStorage.setItem(key, JSON.stringify(merged))
            keysRestored.push(key)
            continue
          }
        } catch { /* fallback to replace */ }
      }
      localStorage.setItem(key, JSON.stringify(value))
      keysRestored.push(key)
    }
    return { ok: true, keysRestored, keysSkipped, conflicts }
  } catch (e) {
    return {
      ok: false,
      keysRestored,
      keysSkipped,
      conflicts,
      error: e instanceof Error ? e.message : 'Erro ao restaurar.',
    }
  }
}

export function restoreFromJson(json: string, strategy: RestoreStrategy = 'merge'): RestoreResult {
  const validated = validateBackupFile(json)
  if (!validated.ok) {
    const errorResult = validated as { ok: false; error: string }
    return { ok: false, keysRestored: [], keysSkipped: [], conflicts: [], error: errorResult.error }
  }
  return restoreFromPayload(validated.payload, strategy)
}
