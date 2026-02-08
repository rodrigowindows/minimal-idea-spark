import { useState, useEffect, useCallback } from 'react';
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

  // When coming back online, run sync if there are pending items
  useEffect(() => {
    if (!online || pendingCount === 0) return;
    runSync();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  const runSync = useCallback(async () => {
    if (!online || queueItems.length === 0) return;
    const processor = createSyncProcessor(supabase);
    const result = await processQueue(processor);
    setLastError(
      result.failed > 0
        ? `${result.failed} item(s) failed to sync.`
        : null
    );
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
