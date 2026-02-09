/**
 * Hook to guard actions that require an internet connection (AI calls, uploads, etc.).
 * Shows a toast message when the user tries to perform an online-only action while offline.
 */

import { useCallback } from 'react'
import { toast } from 'sonner'
import { useOnlineStatus } from './useOnlineStatus'

const OFFLINE_MESSAGES: Record<string, string> = {
  ai: 'O assistente de IA precisa de conexão com a internet.',
  upload: 'O upload de arquivos precisa de conexão com a internet.',
  default: 'Esta ação precisa de conexão com a internet.',
}

/**
 * Returns a guard function. Call it before online-only operations.
 * If offline, it shows a toast and returns `false`.
 * If online, returns `true` so you can proceed.
 *
 * @example
 * const requireOnline = useRequireOnline()
 * const handleAICall = () => {
 *   if (!requireOnline('ai')) return
 *   // proceed with AI call...
 * }
 */
export function useRequireOnline() {
  const isOnline = useOnlineStatus()

  return useCallback(
    (action: keyof typeof OFFLINE_MESSAGES | string = 'default'): boolean => {
      if (isOnline) return true
      const message = OFFLINE_MESSAGES[action] || OFFLINE_MESSAGES.default
      toast.error(message, { id: `offline-guard-${action}` })
      return false
    },
    [isOnline]
  )
}
