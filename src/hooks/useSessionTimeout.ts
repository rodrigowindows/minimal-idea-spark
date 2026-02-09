import { useState, useEffect, useCallback } from 'react'
import {
  getSessionTimeoutMs,
  touchSession,
  getLastActivity,
  isSessionExpired,
  setSessionWarningShown,
  wasSessionWarningShown,
  clearSessionWarning,
  refreshTokenIfNeeded,
} from '@/lib/auth/session-utils'
import { toast } from 'sonner'

const WARNING_BEFORE_MS = 2 * 60 * 1000 // warn 2 min before expiry
const CHECK_INTERVAL_MS = 60 * 1000 // check every minute

export function useSessionTimeout(onExpire: () => void, onWarning?: () => void) {
  const [showWarning, setShowWarning] = useState(false)
  const timeoutMs = getSessionTimeoutMs()

  const expire = useCallback(() => {
    clearSessionWarning()
    onExpire()
  }, [onExpire])

  useEffect(() => {
    touchSession()
    const onActivity = () => touchSession()
    window.addEventListener('click', onActivity)
    window.addEventListener('keydown', onActivity)
    const interval = setInterval(async () => {
      // Proactively refresh token before it expires
      await refreshTokenIfNeeded()

      if (isSessionExpired(timeoutMs)) {
        expire()
        return
      }
      const last = getLastActivity()
      const remaining = timeoutMs - (Date.now() - last)
      if (remaining > 0 && remaining <= WARNING_BEFORE_MS && !wasSessionWarningShown()) {
        setSessionWarningShown()
        setShowWarning(true)
        const minutes = Math.ceil(remaining / 60_000)
        toast.warning(
          `Sua sessao expira em ${minutes} minuto${minutes > 1 ? 's' : ''}. Interaja para manter-se conectado.`,
          { duration: 10_000 }
        )
        onWarning?.()
      }
    }, CHECK_INTERVAL_MS)
    return () => {
      window.removeEventListener('click', onActivity)
      window.removeEventListener('keydown', onActivity)
      clearInterval(interval)
    }
  }, [timeoutMs, expire, onWarning])

  return { showWarning, dismissWarning: () => setShowWarning(false) }
}
