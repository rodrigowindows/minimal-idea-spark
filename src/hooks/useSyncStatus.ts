import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import {
  getQueue,
  getConflicts,
  getPendingCount,
  processQueue,
  subscribeQueue,
  subscribeConflicts,
  subscribeSyncStatus,
  clearQueue,
  clearConflicts,
  type QueuedItem,
  type SyncConflict,
} from '@/lib/pwa/sync-queue';
import { createSyncProcessor } from '@/lib/pwa/sync-processor';
import { supabase } from '@/integrations/supabase/client';

export type SyncStatus = 'online' | 'offline' | 'syncing';

/**
 * Sync status for offline queue (prompt 26). Exposes online/syncing, pending count, conflicts, runSync, clear.
 * @see lib/pwa/sync-queue.ts
 */
export function useSyncStatus() {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [queueItems, setQueueItems] = useState<QueuedItem[]>([]);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);

  const status: SyncStatus = syncing ? 'syncing' : online ? 'online' : 'offline';

  useEffect(() => {
    setQueueItems(getQueue());
    setConflicts(getConflicts());
    setPendingCount(getPendingCount());

    const unsubQueue = subscribeQueue((items) => {
      setQueueItems(items);
      setPendingCount(getPendingCount());
    });
    const unsubConflicts = subscribeConflicts((c) => {
      setConflicts(c);
      setPendingCount(getPendingCount());
    });
    const unsubStatus = subscribeSyncStatus((isSyncing, error) => {
      setSyncing(isSyncing);
      setLastError(error);
    });

    return () => {
      unsubQueue();
      unsubConflicts();
      unsubStatus();
    };
  }, []);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const wasOffline = useRef(false);

  // Track offline → online transitions
  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
    }
  }, [online]);

  // When coming back online, run sync if there are pending items
  useEffect(() => {
    if (!online || pendingCount === 0) return;
    runSync(wasOffline.current);
    wasOffline.current = false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  // Auto-sync when online and new items arrive (debounced)
  const syncTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!online || queueItems.length === 0 || syncing) return;
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      runSync();
    }, 500);
    return () => clearTimeout(syncTimer.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, queueItems.length, syncing]);

  const runSync = useCallback(async (showToast = false) => {
    if (!online || queueItems.length === 0) return;
    const count = queueItems.length;
    const toastId = showToast
      ? toast.loading(`Sincronizando ${count} ${count === 1 ? 'item' : 'itens'}...`)
      : undefined;
    const processor = createSyncProcessor(supabase);
    const result = await processQueue(processor);
    if (result.failed > 0) {
      setLastError(`${result.failed} item(s) failed to sync.`);
      if (toastId) {
        toast.error(
          `${result.processed} sincronizado(s), ${result.failed} falhou/falharam.`,
          { id: toastId }
        );
      }
    } else {
      setLastError(null);
      if (toastId) {
        toast.success(
          result.conflicts > 0
            ? `${result.processed} sincronizado(s), ${result.conflicts} conflito(s).`
            : `${result.processed} ${result.processed === 1 ? 'item sincronizado' : 'itens sincronizados'}.`,
          { id: toastId }
        );
      }
    }
    return result;
  }, [online, queueItems.length]);

  const clearPendingQueue = useCallback(() => {
    clearQueue();
    setQueueItems(getQueue());
    setPendingCount(getPendingCount());
  }, []);

  const clearPendingConflicts = useCallback(() => {
    clearConflicts();
    setConflicts(getConflicts());
    setPendingCount(getPendingCount());
  }, []);

  return {
    status,
    online,
    syncing,
    pendingCount,
    lastError,
    queueItems,
    conflicts,
    runSync,
    clearPendingQueue,
    clearPendingConflicts,
  };
}
