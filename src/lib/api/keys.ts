/**
 * API keys per user/workspace for programmatic access.
 * Hybrid: localStorage for offline fallback, Supabase for production.
 */

import { supabase } from '@/integrations/supabase/client'

const STORAGE_KEY = 'lifeos_api_keys'

export interface ApiKeyRecord {
  id: string
  name: string
  prefix: string
  scopes: string[]
  last_used_at: string | null
  expires_at: string | null
  revoked_at: string | null
  created_at: string
}

// --------------- localStorage fallback ---------------

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

// --------------- Public API ---------------

export function listApiKeys(): ApiKeyRecord[] {
  return loadKeys()
}

export async function listApiKeysAsync(): Promise<ApiKeyRecord[]> {
  const { data, error } = await (supabase as any)
    .from('api_keys')
    .select('id, name, prefix, scopes, last_used_at, expires_at, revoked_at, created_at')
    .is('revoked_at', null)
    .order('created_at', { ascending: false })

  if (error || !data) return loadKeys()

  const keys = data.map((k: any) => ({
    id: k.id,
    name: k.name,
    prefix: k.prefix,
    scopes: k.scopes ?? ['read', 'write'],
    last_used_at: k.last_used_at,
    expires_at: k.expires_at,
    revoked_at: k.revoked_at,
    created_at: k.created_at,
  }))

  saveKeys(keys)
  return keys
}

export function createApiKey(name: string, scopes: string[] = ['read', 'write']): { key: string; record: ApiKeyRecord } {
  const id = `key-${Date.now()}`
  const secret = `lsk_${crypto.randomUUID().replace(/-/g, '')}`
  const prefix = secret.slice(0, 12) + '...'
  const record: ApiKeyRecord = {
    id,
    name,
    prefix,
    scopes,
    last_used_at: null,
    expires_at: null,
    revoked_at: null,
    created_at: new Date().toISOString(),
  }
  const keys = loadKeys()
  keys.push(record)
  saveKeys(keys)
  return { key: secret, record }
}

export async function createApiKeyAsync(
  name: string,
  scopes: string[] = ['read', 'write'],
): Promise<{ key: string; record: ApiKeyRecord } | null> {
  const secret = `lsk_${crypto.randomUUID().replace(/-/g, '')}`
  const prefix = secret.slice(0, 12) + '...'

  // Hash the key for storage (we keep only the hash in DB)
  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(secret))
  const keyHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  const { data, error } = await (supabase as any)
    .from('api_keys')
    .insert({ name, key_hash: keyHash, prefix, scopes })
    .select()
    .single()

  if (error || !data) {
    // fallback to local
    return createApiKey(name, scopes)
  }

  const record: ApiKeyRecord = {
    id: data.id,
    name: data.name,
    prefix: data.prefix,
    scopes: data.scopes ?? scopes,
    last_used_at: null,
    expires_at: data.expires_at,
    revoked_at: null,
    created_at: data.created_at,
  }

  // sync local cache
  const keys = loadKeys()
  keys.push(record)
  saveKeys(keys)

  return { key: secret, record }
}

export function revokeApiKey(id: string): boolean {
  const all = loadKeys()
  const keys = all.filter((k) => k.id !== id)
  if (keys.length === all.length) return false
  saveKeys(keys)
  return true
}

export async function revokeApiKeyAsync(id: string): Promise<boolean> {
  const { error } = await (supabase as any)
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return revokeApiKey(id)

  revokeApiKey(id)
  return true
}

/** Get usage logs for a specific API key */
export async function getApiKeyUsage(apiKeyId: string, limit = 50): Promise<Array<{
  method: string
  path: string
  status_code: number
  created_at: string
}>> {
  const { data } = await (supabase as any)
    .from('api_usage_logs')
    .select('method, path, status_code, created_at')
    .eq('api_key_id', apiKeyId)
    .order('created_at', { ascending: false })
    .limit(limit)

  return data ?? []
}
