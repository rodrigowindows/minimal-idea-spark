import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useSyncStatus } from '@/hooks/useSyncStatus'

type NetworkStatus = 'online' | 'offline' | 'syncing'

interface NetworkStatusContextValue {
  status: NetworkStatus
  isOnline: boolean
  isSyncing: boolean
  pendingCount: number
  forceRefresh: () => void
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

  return (
    <NetworkStatusContext.Provider
      value={{
        status,
        isOnline,
        isSyncing: syncing,
        pendingCount,
        forceRefresh,
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
