import type { BackupPayload } from './backup'

export type RestoreStrategy = 'replace' | 'merge' | 'skip'

export interface RestoreResult {
  ok: boolean
  keysRestored: string[]
  keysSkipped: string[]
  error?: string
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
            for (const item of value as Array<{ id?: string }>) {
              if (item.id && !ids.has(item.id)) {
                merged.push(item)
                ids.add(item.id)
              }
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
    return { ok: true, keysRestored, keysSkipped }
  } catch (e) {
    return {
      ok: false,
      keysRestored,
      keysSkipped,
      error: e instanceof Error ? e.message : 'Erro ao restaurar.',
    }
  }
}

export function restoreFromJson(json: string, strategy: RestoreStrategy = 'merge'): RestoreResult {
  const validated = validateBackupFile(json)
  if (!validated.ok) {
    const errorResult = validated as { ok: false; error: string }
    return { ok: false, keysRestored: [], keysSkipped: [], error: errorResult.error }
  }
  return restoreFromPayload(validated.payload, strategy)
}
