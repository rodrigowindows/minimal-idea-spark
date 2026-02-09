import { useEffect, useState } from 'react'
import { WifiOff, RefreshCw, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useSyncStatus } from '@/hooks/useSyncStatus'

export function OfflineBanner() {
  const isOnline = useOnlineStatus()
  const { pendingCount, syncing, runSync } = useSyncStatus()
  const [dismissed, setDismissed] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Re-show when going offline again
  useEffect(() => {
    if (!isOnline) setDismissed(false)
  }, [isOnline])

  const handleForceRefresh = async () => {
    setRefreshing(true)
    try {
      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map((k) => caches.delete(k)))
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations()
        await Promise.all(regs.map((r) => r.unregister()))
      }
      window.location.reload()
    } catch {
      window.location.reload()
    }
  }

  // Nothing to show
  if (isOnline && !syncing) return null
  if (dismissed && isOnline) return null

  // Syncing state
  if (isOnline && syncing) {
    return (
      <div
        className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-primary/10 text-primary"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        <span>
          Sincronizando {pendingCount} {pendingCount === 1 ? 'item' : 'itens'}...
        </span>
        <Button variant="ghost" size="sm" className="h-7 text-inherit" onClick={() => runSync()}>
          <RefreshCw className="mr-1 h-3.5 w-3.5" />
          Sincronizar agora
        </Button>
      </div>
    )
  }

  // Offline state
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-2.5 text-sm',
        'bg-amber-500/90 text-amber-950 dark:bg-amber-600/90 dark:text-amber-50'
      )}
      role="alert"
      aria-live="polite"
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      <span className="flex-1">
        <strong>Você está offline.</strong>{' '}
        Seus dados estão salvos localmente e serão sincronizados quando voltar online.
      </span>

      {pendingCount > 0 && (
        <span className="rounded-full bg-black/10 px-2 py-0.5 text-xs font-medium shrink-0">
          {pendingCount} na fila
        </span>
      )}

      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs text-inherit hover:bg-amber-600/20 dark:hover:bg-amber-700/30"
          onClick={handleForceRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          Forçar atualização
        </Button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded p-1 hover:bg-amber-600/20 dark:hover:bg-amber-700/30"
          aria-label="Fechar aviso"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
