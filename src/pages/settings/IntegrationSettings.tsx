import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Cloud, CloudOff, Key, List, Loader2, RotateCcw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { listApiKeys } from '@/lib/api/keys'
import { listWebhooks } from '@/lib/api/webhooks'
import { clearAllMappings } from '@/lib/pwa/sync-id-map'
import { enqueue, removeConflict } from '@/lib/pwa/sync-queue'
import { useSyncStatus } from '@/hooks/useSyncStatus'
import { BookmarkletGenerator } from '@/components/settings/BookmarkletGenerator'
import { DigestSettings } from '@/components/settings/DigestSettings'
import { EmailCaptureSettings } from '@/components/settings/EmailCaptureSettings'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function IntegrationSettings() {
  const { t } = useTranslation()
  const [showQueueDialog, setShowQueueDialog] = useState(false)
  const [apiKeys] = useState(() => listApiKeys())
  const [webhooks] = useState(() => listWebhooks())
  const {
    status,
    pendingCount,
    queueItems,
    conflicts,
    clearPendingQueue,
    clearPendingConflicts,
    runSync,
    lastError,
  } = useSyncStatus()

  return (
    <>
      <EmailCaptureSettings />
      <DigestSettings />
      <BookmarkletGenerator />

      <Card className="rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Key className="h-5 w-5 text-primary" />
            {t('settings.integrations')}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t('settings.integrationsDescription')}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <div>
              <p className="text-sm font-medium">
                {t('settings.apiKeys')}: {apiKeys.length}
              </p>
              <p className="text-sm font-medium">
                {t('settings.webhooks')}: {webhooks.length}
              </p>
            </div>
            <Link to="/integrations">
              <Button variant="outline" size="sm" className="gap-1">
                <Key className="h-4 w-4" />
                {t('settings.manageIntegrations', 'Manage Integrations')}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            {status === 'syncing' ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : status === 'offline' ? (
              <CloudOff className="h-5 w-5 text-amber-500" />
            ) : (
              <Cloud className="h-5 w-5 text-primary" />
            )}
            {t('settings.sync')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-2 text-sm">
            <span className="text-muted-foreground">{t('settings.syncStatus')}</span>
            <Badge variant={status === 'offline' ? 'destructive' : 'secondary'}>
              {status === 'offline'
                ? t('settings.offline')
                : status === 'syncing'
                  ? t('settings.syncing')
                  : t('settings.online')}
            </Badge>
          </div>

          {(pendingCount > 0 || queueItems.length > 0 || conflicts.length > 0) && (
            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-2 text-sm">
              <span className="text-muted-foreground">{t('settings.inQueue')}</span>
              <Badge variant="secondary">
                {queueItems.length + conflicts.length} {t('settings.items')}
              </Badge>
            </div>
          )}

          {lastError && <p className="text-xs text-destructive">{lastError}</p>}

          <div className="flex flex-wrap gap-2">
            {(queueItems.length > 0 || conflicts.length > 0) && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => setShowQueueDialog(true)}
              >
                <List className="h-4 w-4" />
                {t('settings.viewQueue')}
              </Button>
            )}

            {queueItems.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-destructive"
                onClick={() => {
                  if (!window.confirm(t('settings.clearQueueConfirm'))) return
                  clearPendingQueue()
                  clearPendingConflicts()
                  setShowQueueDialog(false)
                  toast.success(t('settings.queueCleared'))
                }}
              >
                <Trash2 className="h-4 w-4" />
                {t('settings.clearQueue')}
              </Button>
            )}

            {status === 'online' && pendingCount > 0 && (
              <Button
                size="sm"
                className="gap-1"
                onClick={() => runSync().then(() => toast.success(t('settings.syncDone')))}
              >
                <Cloud className="h-4 w-4" />
                {t('settings.syncNow')}
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-muted-foreground"
              onClick={() => {
                if (
                  !window.confirm(
                    t('settings.clearIdMapConfirm') ||
                      'Limpar mapeamento local↔servidor? Use só se tiver problemas de sincronização.',
                  )
                ) {
                  return
                }
                clearAllMappings()
                toast.success(t('settings.idMapCleared') || 'Mapeamento limpo.')
              }}
            >
              {t('settings.clearIdMap') || 'Limpar mapeamento de IDs'}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-muted-foreground"
              onClick={async () => {
                if (
                  !window.confirm(
                    'Limpar todo o cache offline e recarregar? Dados não sincronizados podem ser perdidos.',
                  )
                ) {
                  return
                }

                try {
                  const { clearAllStores } = await import('@/lib/offline/offline-db')
                  await clearAllStores()
                  if ('caches' in window) {
                    const keys = await caches.keys()
                    await Promise.all(keys.map((key) => caches.delete(key)))
                  }
                  if ('serviceWorker' in navigator) {
                    const regs = await navigator.serviceWorker.getRegistrations()
                    await Promise.all(regs.map((registration) => registration.unregister()))
                  }
                } catch {
                  // noop: reload still refreshes app state
                }
                window.location.reload()
              }}
            >
              <RotateCcw className="h-4 w-4" />
              Forçar atualização (limpar cache)
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showQueueDialog} onOpenChange={setShowQueueDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('settings.syncQueueTitle')}</DialogTitle>
          </DialogHeader>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {queueItems.length === 0 && conflicts.length === 0 && (
              <p className="text-sm text-muted-foreground">{t('settings.noPendingItems')}</p>
            )}

            {queueItems.map((item) => (
              <div key={item.id} className="rounded-lg border border-border/50 p-2 text-sm">
                <span className="font-medium">{item.type.replace(/_/g, ' ')}</span>
                <span className="ml-1 text-muted-foreground">• {item.localId}</span>
              </div>
            ))}

            {conflicts.map((conflict) => (
              <div
                key={conflict.queueId}
                className="space-y-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm"
              >
                <div>
                  <span className="font-medium">
                    {t('settings.conflict')}: {conflict.type.replace(/_/g, ' ')}
                  </span>
                  <span className="ml-1 text-muted-foreground">• {conflict.localId}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {conflict.reason === 'newer_on_server'
                    ? 'O servidor tem uma versão mais recente deste item.'
                    : 'O servidor rejeitou esta alteração.'}
                </p>
                {conflict.serverData && (
                  <details className="text-xs text-muted-foreground">
                    <summary className="cursor-pointer hover:text-foreground">
                      Ver dados do servidor
                    </summary>
                    <pre className="mt-1 max-h-24 overflow-auto rounded bg-muted p-1.5 text-[10px]">
                      {JSON.stringify(conflict.serverData, null, 2)}
                    </pre>
                  </details>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => {
                      enqueue(conflict.type, conflict.payload, conflict.localId)
                      removeConflict(conflict.queueId)
                      toast.success('Mantendo versão local. Re-enviando...')
                    }}
                  >
                    Manter meu
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      removeConflict(conflict.queueId)
                      toast.success('Usando versão do servidor.')
                    }}
                  >
                    Usar do servidor
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQueueDialog(false)}>
              {t('settings.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

