/**
 * Offline-first: cache and queue for when the app is offline.
 */

const CACHE_NAME = 'minimal-idea-spark-v1'
const QUEUE_KEY = 'pwa_action_queue'

export interface QueuedAction {
  id: string
  type: string
  payload: unknown
  createdAt: string
}

export async function isOnline(): Promise<boolean> {
  return navigator.onLine
}

export async function getCachedResponse(url: string): Promise<Response | null> {
  if (!('caches' in window)) return null
  const cache = await caches.open(CACHE_NAME)
  return cache.match(url)
}

export async function cacheResponse(url: string, response: Response): Promise<void> {
  if (!('caches' in window)) return
  const cache = await caches.open(CACHE_NAME)
  await cache.put(url, response.clone())
}

export function getActionQueue(): QueuedAction[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function enqueueAction(type: string, payload: unknown): void {
  const queue = getActionQueue()
  queue.push({
    id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type,
    payload,
    createdAt: new Date().toISOString(),
  })
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

export function clearActionQueue(ids: string[]): void {
  const set = new Set(ids)
  const queue = getActionQueue().filter(q => !set.has(q.id))
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

export function flushQueueWith(fn: (action: QueuedAction) => Promise<void>): Promise<void> {
  const queue = getActionQueue()
  if (queue.length === 0) return Promise.resolve()
  return Promise.all(queue.map(fn)).then(() => {
    localStorage.removeItem(QUEUE_KEY)
  })
}
