/**
 * API keys per user/workspace for programmatic access.
 * Stub: stores in localStorage; production would use Supabase table api_keys.
 */

const STORAGE_KEY = 'lifeos_api_keys'

export interface ApiKeyRecord {
  id: string
  name: string
  prefix: string
  created_at: string
}

function loadKeys(): ApiKeyRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return []
}

function saveKeys(keys: ApiKeyRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys))
}

export function listApiKeys(): ApiKeyRecord[] {
  return loadKeys()
}

export function createApiKey(name: string): { key: string; record: ApiKeyRecord } {
  const id = `key-${Date.now()}`
  const secret = `${id}-${crypto.randomUUID().replace(/-/g, '')}`
  const prefix = secret.slice(0, 12) + '…'
  const record: ApiKeyRecord = { id, name, prefix, created_at: new Date().toISOString() }
  const keys = loadKeys()
  keys.push(record)
  saveKeys(keys)
  return { key: secret, record }
}

export function revokeApiKey(id: string): boolean {
  const keys = loadKeys().filter((k) => k.id !== id)
  if (keys.length === loadKeys().length) return false
  saveKeys(keys)
  return true
}
