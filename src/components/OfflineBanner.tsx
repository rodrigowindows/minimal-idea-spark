import { WifiOff, RefreshCw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useSyncStatus } from '@/hooks/useSyncStatus'
import { useTranslation } from 'react-i18next'

export function OfflineBanner() {
  const isOnline = useOnlineStatus()
  const { pendingCount, syncing, runSync } = useSyncStatus()
  const { t } = useTranslation()

  if (isOnline && !syncing) return null

  return (
    <div
      className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium"
      role="status"
      aria-live="polite"
      style={{
        backgroundColor: !isOnline ? 'hsl(var(--destructive) / 0.15)' : 'hsl(var(--primary) / 0.2)',
        color: !isOnline ? 'hsl(var(--destructive))' : 'hsl(var(--primary-foreground))',
      }}
    >
      {!isOnline ? (
        <>
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>{t('settings.offline')}</span>
          {pendingCount > 0 && (
            <span className="rounded-full bg-black/10 px-2 py-0.5">
              {pendingCount} {t('settings.inQueue')}
            </span>
          )}
        </>
      ) : (
        <>
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          <span>{t('settings.syncing')}</span>
          <Button variant="ghost" size="sm" className="h-7 text-inherit" onClick={() => runSync()}>
            <RefreshCw className="mr-1 h-3.5 w-3.5" />
            {t('settings.syncNow')}
          </Button>
        </>
      )}
    </div>
  )
}
