/**
 * Offline operations queue – re-exports from the PWA sync-queue
 * for convenient access from the src/lib/offline/ path.
 */

export {
  enqueue,
  getQueue,
  getPendingCount,
  processQueue,
  clearQueue,
  getConflicts,
  clearConflicts,
  resolveConflict,
  removeFromQueue,
  subscribeQueue,
  subscribeConflicts,
  subscribeSyncStatus,
  type QueuedItem,
  type SyncActionType,
  type SyncConflict,
  type ConflictResolution,
  type ProcessItemResult,
  type ProcessQueueHandler,
} from '@/lib/pwa/sync-queue';
