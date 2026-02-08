/**
 * List and revoke sessions (devices).
 * Supabase does not expose session list by default; this uses storage + metadata when available.
 */
import { supabase } from '@/integrations/supabase/client'

export interface SessionInfo {
  id: string
  created_at?: string
  device?: string
  current?: boolean
}

const STORAGE_KEY = 'lifeos_sessions_meta'

export async function getSessions(): Promise<SessionInfo[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return []
  const stored = localStorage.getItem(STORAGE_KEY)
  let list: SessionInfo[] = []
  try {
    if (stored) list = JSON.parse(stored)
  } catch { /* ignore */ }
  const currentId = session.access_token?.slice(0, 20) ?? 'current'
  if (!list.some((s) => s.current)) {
    list = [{ id: currentId, current: true, device: 'This device' }, ...list.filter((s) => s.id !== currentId)]
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
    } catch { /* ignore */ }
  }
  return list
}

export async function revokeSession(sessionId: string): Promise<{ error?: string }> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'Not authenticated' }
  if (sessionId === session.access_token?.slice(0, 20)) {
    await supabase.auth.signOut()
    return {}
  }
  const stored = localStorage.getItem(STORAGE_KEY)
  let list: SessionInfo[] = []
  try {
    if (stored) list = JSON.parse(stored).filter((s: SessionInfo) => s.id !== sessionId)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch { /* ignore */ }
  return {}
}

export function registerCurrentSession(deviceLabel?: string) {
  const stored = localStorage.getItem(STORAGE_KEY)
  let list: SessionInfo[] = []
  try {
    if (stored) list = JSON.parse(stored)
  } catch { /* ignore */ }
  const id = `sess-${Date.now()}`
  list = [{ id, device: deviceLabel ?? 'Device', current: true }, ...list.slice(0, 9)]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}
