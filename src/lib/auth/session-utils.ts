import { supabase } from '@/integrations/supabase/client'

const SESSION_TIMEOUT_KEY = 'lifeos_session_last_activity'
const SESSION_WARNING_KEY = 'lifeos_session_warning_shown'
const TOKEN_REFRESH_KEY = 'lifeos_token_last_refresh'

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000 // 30 min
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000 // refresh 5 min before expiry

export function getSessionTimeoutMs(): number {
  try {
    const stored = localStorage.getItem('lifeos_session_timeout_min')
    if (stored) return Math.max(60_000, parseInt(stored, 10) * 60 * 1000)
  } catch { /* ignore */ }
  return DEFAULT_TIMEOUT_MS
}

export function touchSession(): void {
  try {
    localStorage.setItem(SESSION_TIMEOUT_KEY, String(Date.now()))
  } catch { /* ignore */ }
}

export function getLastActivity(): number {
  try {
    const v = localStorage.getItem(SESSION_TIMEOUT_KEY)
    return v ? parseInt(v, 10) : 0
  } catch {
    return 0
  }
}

export function isSessionExpired(timeoutMs?: number): boolean {
  const last = getLastActivity()
  const timeout = timeoutMs ?? getSessionTimeoutMs()
  return last > 0 && Date.now() - last > timeout
}

export function setSessionWarningShown(): void {
  try {
    sessionStorage.setItem(SESSION_WARNING_KEY, '1')
  } catch { /* ignore */ }
}

export function wasSessionWarningShown(): boolean {
  try {
    return sessionStorage.getItem(SESSION_WARNING_KEY) === '1'
  } catch {
    return false
  }
}

export function clearSessionWarning(): void {
  try {
    sessionStorage.removeItem(SESSION_WARNING_KEY)
  } catch { /* ignore */ }
}

/**
 * Proactively refresh the Supabase token before it expires.
 * Returns true if a refresh was performed.
 */
export async function refreshTokenIfNeeded(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return false

    const expiresAt = session.expires_at
    if (!expiresAt) return false

    const expiresMs = expiresAt * 1000
    const now = Date.now()
    const remaining = expiresMs - now

    if (remaining <= TOKEN_REFRESH_BUFFER_MS) {
      const lastRefresh = parseInt(localStorage.getItem(TOKEN_REFRESH_KEY) ?? '0', 10)
      // Don't refresh more than once per minute
      if (now - lastRefresh < 60_000) return false

      const { error } = await supabase.auth.refreshSession()
      if (!error) {
        localStorage.setItem(TOKEN_REFRESH_KEY, String(now))
        return true
      }
    }
  } catch { /* ignore */ }
  return false
}

/**
 * Sign out from all devices by calling Supabase global sign out.
 */
export async function signOutAllDevices(): Promise<{ error?: string }> {
  try {
    const { error } = await supabase.auth.signOut({ scope: 'global' })
    if (error) return { error: error.message }
    localStorage.removeItem('lifeos_sessions_meta')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to sign out' }
  }
}
