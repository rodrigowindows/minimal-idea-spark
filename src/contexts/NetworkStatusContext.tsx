import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useSyncStatus } from '@/hooks/useSyncStatus'
import { clearAllStores } from '@/lib/offline/offline-db'

type NetworkStatus = 'online' | 'offline' | 'syncing'

interface NetworkStatusContextValue {
  status: NetworkStatus
  isOnline: boolean
  isSyncing: boolean
  pendingCount: number
  /** Simple page reload */
  forceRefresh: () => void
  /** Clear all offline caches (IndexedDB + Cache API + SW) and reload */
  clearCacheAndReload: () => Promise<void>
}

const NetworkStatusContext = createContext<NetworkStatusContextValue | undefined>(undefined)

export function NetworkStatusProvider({ children }: { children: ReactNode }) {
  const isOnline = useOnlineStatus()
  const { pendingCount, syncing } = useSyncStatus()
  const [status, setStatus] = useState<NetworkStatus>('online')

  useEffect(() => {
    if (!isOnline) setStatus('offline')
    else if (syncing) setStatus('syncing')
    else setStatus('online')
  }, [isOnline, syncing])

  const forceRefresh = useCallback(() => {
    window.location.reload()
  }, [])

  const clearCacheAndReload = useCallback(async () => {
    try {
      await clearAllStores()
      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map((k) => caches.delete(k)))
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations()
        await Promise.all(regs.map((r) => r.unregister()))
      }
    } catch {
      // best-effort
    }
    window.location.reload()
  }, [])

  return (
    <NetworkStatusContext.Provider
      value={{
        status,
        isOnline,
        isSyncing: syncing,
        pendingCount,
        forceRefresh,
        clearCacheAndReload,
      }}
    >
      {children}
    </NetworkStatusContext.Provider>
  )
}

export function useNetworkStatus() {
  const ctx = useContext(NetworkStatusContext)
  if (ctx === undefined) throw new Error('useNetworkStatus must be used within NetworkStatusProvider')
  return ctx
}
