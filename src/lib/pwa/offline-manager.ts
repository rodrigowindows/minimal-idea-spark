/**
 * Offline-first manager: cache, action queue, background sync, connectivity.
 */

const CACHE_NAME = 'canvas-v2-dynamic';
const QUEUE_KEY = 'pwa_action_queue';
const SYNC_TAG = 'sync-offline-actions';

/* ─── Types ─── */
export interface QueuedAction {
  id: string;
  type: string;
  payload: unknown;
  createdAt: string;
  retries: number;
}

export type ConnectivityStatus = 'online' | 'offline';

type ConnectivityListener = (status: ConnectivityStatus) => void;

/* ─── Connectivity ─── */
const listeners = new Set<ConnectivityListener>();

export function getConnectivityStatus(): ConnectivityStatus {
  return navigator.onLine ? 'online' : 'offline';
}

export function onConnectivityChange(fn: ConnectivityListener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

function notifyListeners(status: ConnectivityStatus) {
  listeners.forEach((fn) => fn(status));
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    notifyListeners('online');
    flushQueueWithSync();
  });
  window.addEventListener('offline', () => notifyListeners('offline'));
}

/* ─── Cache API helpers ─── */
export async function getCachedResponse(url: string): Promise<Response | null> {
  if (!('caches' in window)) return null;
  const cache = await caches.open(CACHE_NAME);
  return cache.match(url);
}

export async function cacheResponse(url: string, response: Response): Promise<void> {
  if (!('caches' in window)) return;
  const cache = await caches.open(CACHE_NAME);
  await cache.put(url, response.clone());
}

export async function removeCached(url: string): Promise<boolean> {
  if (!('caches' in window)) return false;
  const cache = await caches.open(CACHE_NAME);
  return cache.delete(url);
}

/* ─── Action Queue (localStorage-backed) ─── */
export function getActionQueue(): QueuedAction[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedAction[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function enqueueAction(type: string, payload: unknown): QueuedAction {
  const queue = getActionQueue();
  const action: QueuedAction = {
    id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type,
    payload,
    createdAt: new Date().toISOString(),
    retries: 0,
  };
  queue.push(action);
  saveQueue(queue);
  requestBackgroundSync();
  return action;
}

export function removeActions(ids: string[]): void {
  const set = new Set(ids);
  const queue = getActionQueue().filter((q) => !set.has(q.id));
  saveQueue(queue);
}

export function clearActionQueue(): void {
  localStorage.removeItem(QUEUE_KEY);
}

export function getQueueSize(): number {
  return getActionQueue().length;
}

/* ─── Flush queue with a handler ─── */
export async function flushQueueWith(
  handler: (action: QueuedAction) => Promise<void>,
  maxRetries = 3
): Promise<{ succeeded: string[]; failed: string[] }> {
  const queue = getActionQueue();
  if (queue.length === 0) return { succeeded: [], failed: [] };

  const succeeded: string[] = [];
  const failed: string[] = [];

  for (const action of queue) {
    try {
      await handler(action);
      succeeded.push(action.id);
    } catch {
      action.retries += 1;
      if (action.retries >= maxRetries) {
        failed.push(action.id);
      }
    }
  }

  // Remove succeeded and permanently failed
  const toRemove = new Set([...succeeded, ...failed]);
  const remaining = queue.filter((a) => !toRemove.has(a.id));
  saveQueue(remaining);

  return { succeeded, failed };
}

/* ─── Background Sync ─── */
export async function requestBackgroundSync(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    if ('sync' in reg) {
      await (reg as any).sync.register(SYNC_TAG);
      return true;
    }
  } catch {
    // Background sync not supported; will flush on next online event
  }
  return false;
}

async function flushQueueWithSync() {
  // Default sync handler: just clear succeeded ones
  // The actual sync logic should be registered by the app
  const handler = (globalThis as any).__pwaQueueHandler;
  if (handler) {
    await flushQueueWith(handler);
  }
}

export function registerQueueHandler(handler: (action: QueuedAction) => Promise<void>) {
  (globalThis as any).__pwaQueueHandler = handler;
}

/* ─── SW message listener for background sync trigger ─── */
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'SYNC_OFFLINE_ACTIONS') {
      flushQueueWithSync();
    }
  });
}

/* ─── Periodic connectivity check (for flaky connections) ─── */
let pingInterval: ReturnType<typeof setInterval> | null = null;

export function startConnectivityPolling(intervalMs = 30000): () => void {
  if (pingInterval) clearInterval(pingInterval);
  pingInterval = setInterval(async () => {
    try {
      const res = await fetch('/manifest.json', { method: 'HEAD', cache: 'no-store' });
      if (res.ok && !navigator.onLine) {
        notifyListeners('online');
      }
    } catch {
      if (navigator.onLine) {
        notifyListeners('offline');
      }
    }
  }, intervalMs);

  return () => {
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }
  };
}
