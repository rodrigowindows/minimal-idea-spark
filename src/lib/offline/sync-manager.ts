/**
 * Sync manager: coordinates offline cache ↔ server synchronisation.
 * Re-exports core sync primitives and adds cache-population helpers.
 */

export {
  processQueue,
  enqueue,
  getQueue,
  getPendingCount,
  clearQueue,
  getConflicts,
  clearConflicts,
  resolveConflict,
  type SyncActionType,
  type QueuedItem,
  type SyncConflict,
  type ConflictResolution,
} from '@/lib/pwa/sync-queue';

export { createSyncProcessor } from '@/lib/pwa/sync-processor';

export {
  registerFlushSyncQueue,
  requestBackgroundSync,
  getConnectivityStatus,
  onConnectivityChange,
  startConnectivityPolling,
} from '@/lib/pwa/offline-manager';

import { supabase } from '@/integrations/supabase/client';
import { putMany, setLastSyncTime, type StoreName } from './offline-db';

/**
 * Fetch entities from Supabase and populate the IndexedDB cache.
 * Should be called when online to keep the cache fresh.
 */
export async function refreshCacheFromServer(stores?: StoreName[]): Promise<void> {
  const targets = stores ?? ['opportunities', 'daily_logs', 'habits', 'goals'];
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return;
  const userId = session.user.id;

  for (const store of targets) {
    try {
      const table = store === 'daily_logs' ? 'daily_logs' : store;
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(500);

      if (!error && data) {
        await putMany(store, data);
        setLastSyncTime(store);
      }
    } catch {
      // Silently skip stores that fail (e.g. table doesn't exist yet)
    }
  }
}
