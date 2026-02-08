const SESSION_TIMEOUT_KEY = 'lifeos_session_last_activity'
const SESSION_WARNING_KEY = 'lifeos_session_warning_shown'

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000 // 30 min

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
