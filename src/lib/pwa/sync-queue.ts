/**
 * Offline sync queue: persist pending actions (IndexedDB-style key: localStorage).
 * Process in order on reconnect; support conflict resolution (keep mine / use server).
 */

const QUEUE_KEY = 'pwa_sync_queue_v1';
const CONFLICTS_KEY = 'pwa_sync_conflicts_v1';
const MAX_RETRIES = 3;

export type SyncActionType =
  | 'create_opportunity'
  | 'update_opportunity'
  | 'delete_opportunity'
  | 'create_daily_log'
  | 'update_daily_log'
  | 'delete_daily_log';

export interface QueuedItem {
  id: string;
  type: SyncActionType;
  payload: Record<string, unknown>;
  createdAt: string;
  retries: number;
  /** Client-generated id (e.g. opp-123, log-456) for local entity */
  localId: string;
}

export interface SyncConflict {
  queueId: string;
  type: SyncActionType;
  localId: string;
  reason: 'rejected' | 'newer_on_server';
  serverData?: Record<string, unknown>;
  payload: Record<string, unknown>;
  createdAt: string;
}

export type ConflictResolution = 'keep_mine' | 'use_server' | 'merge';

type QueueListener = (items: QueuedItem[]) => void;
type ConflictListener = (conflicts: SyncConflict[]) => void;
type StatusListener = (syncing: boolean, error: string | null) => void;

const queueListeners = new Set<QueueListener>();
const conflictListeners = new Set<ConflictListener>();
const statusListeners = new Set<StatusListener>();

/* ─── Persistence ─── */
function loadQueue(): QueuedItem[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedItem[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  notifyQueueListeners(loadQueue());
}

function loadConflicts(): SyncConflict[] {
  try {
    const raw = localStorage.getItem(CONFLICTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveConflicts(conflicts: SyncConflict[]) {
  localStorage.setItem(CONFLICTS_KEY, JSON.stringify(conflicts));
  conflictListeners.forEach((fn) => fn(loadConflicts()));
}

function notifyQueueListeners(items: QueuedItem[]) {
  queueListeners.forEach((fn) => fn(items));
}

function notifyStatus(syncing: boolean, error: string | null) {
  statusListeners.forEach((fn) => fn(syncing, error));
}

/* ─── Public API ─── */

export function getQueue(): QueuedItem[] {
  return loadQueue();
}

export function getConflicts(): SyncConflict[] {
  return loadConflicts();
}

export function getPendingCount(): number {
  return loadQueue().length + loadConflicts().length;
}

/** Enqueue an action for later sync. */
export function enqueue(
  type: SyncActionType,
  payload: Record<string, unknown>,
  localId: string
): QueuedItem {
  const queue = loadQueue();
  const item: QueuedItem = {
    id: `sync-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type,
    payload,
    createdAt: new Date().toISOString(),
    retries: 0,
    localId,
  };
  queue.push(item);
  saveQueue(queue);
  if (typeof window !== 'undefined') {
    import('./offline-manager').then(({ requestBackgroundSync }) => requestBackgroundSync());
  }
  return item;
}

export function removeFromQueue(ids: string[]): void {
  const set = new Set(ids);
  const queue = loadQueue().filter((q) => !set.has(q.id));
  saveQueue(queue);
}

export function clearQueue(): void {
  saveQueue([]);
  notifyQueueListeners([]);
}

export function resolveConflict(queueId: string, resolution: ConflictResolution): void {
  const conflicts = loadConflicts().filter((c) => c.queueId !== queueId);
  saveConflicts(conflicts);
}

export function clearConflicts(): void {
  saveConflicts([]);
}

/** Remove a single conflict (e.g. after user chose "use server" and we updated local). */
export function removeConflict(queueId: string): void {
  resolveConflict(queueId, 'use_server');
}

/** Subscribe to queue changes. */
export function subscribeQueue(fn: QueueListener): () => void {
  queueListeners.add(fn);
  fn(loadQueue());
  return () => queueListeners.delete(fn);
}

/** Subscribe to conflict list changes. */
export function subscribeConflicts(fn: ConflictListener): () => void {
  conflictListeners.add(fn);
  fn(loadConflicts());
  return () => conflictListeners.delete(fn);
}

/** Subscribe to syncing status (syncing, error). */
export function subscribeSyncStatus(fn: StatusListener): () => void {
  statusListeners.add(fn);
  return () => statusListeners.delete(fn);
}

export type ProcessItemResult =
  | { ok: true; serverId?: string }
  | { ok: false; conflict: 'rejected' | 'newer_on_server'; serverData?: Record<string, unknown> };

export type ProcessQueueHandler = (
  item: QueuedItem
) => Promise<ProcessItemResult>;

/** Process the queue with the given handler. Handler is responsible for calling Supabase. */
export async function processQueue(
  handler: ProcessQueueHandler
): Promise<{ processed: number; failed: number; conflicts: number }> {
  const queue = loadQueue();
  if (queue.length === 0) {
    return { processed: 0, failed: 0, conflicts: 0 };
  }

  notifyStatus(true, null);
  let processed = 0;
  let failed = 0;
  let conflicts = 0;
  const remaining: QueuedItem[] = [];
  const newConflicts: SyncConflict[] = loadConflicts();

  for (const item of queue) {
    try {
      const result = await handler(item);
      if (result.ok) {
        processed++;
      } else {
        newConflicts.push({
          queueId: item.id,
          type: item.type,
          localId: item.localId,
          reason: result.conflict,
          serverData: result.serverData,
          payload: item.payload,
          createdAt: item.createdAt,
        });
        conflicts++;
      }
    } catch {
      item.retries += 1;
      if (item.retries >= MAX_RETRIES) {
        failed++;
      } else {
        remaining.push(item);
      }
    }
  }

  saveQueue(remaining);
  saveConflicts(newConflicts);
  notifyStatus(false, null);
  if (failed > 0) {
    notifyStatus(false, `${failed} item(s) failed after ${MAX_RETRIES} retries.`);
  }
  return { processed, failed, conflicts };
}
