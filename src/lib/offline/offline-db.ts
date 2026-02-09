/**
 * IndexedDB-backed offline cache for entity data (opportunities, journal, knowledge base, etc.).
 * Falls back to localStorage transparently if IndexedDB is not available.
 *
 * Uses a single object-store per entity type and simple get/put/delete/getAll operations.
 */

const DB_NAME = 'canvas-offline-cache';
const DB_VERSION = 1;

/** Stores we manage inside IndexedDB */
const STORES = [
  'opportunities',
  'daily_logs',
  'habits',
  'goals',
  'calendar_events',
  'knowledge_base',
] as const;

export type StoreName = (typeof STORES)[number];

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of STORES) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: 'id' });
        }
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

/* ─── Generic CRUD ─── */

export async function getAll<T = Record<string, unknown>>(store: StoreName): Promise<T[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result as T[]);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return fallbackGetAll<T>(store);
  }
}

export async function getById<T = Record<string, unknown>>(store: StoreName, id: string): Promise<T | undefined> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).get(id);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error);
    });
  } catch {
    const all = await fallbackGetAll<T & { id: string }>(store);
    return all.find((item) => item.id === id) as T | undefined;
  }
}

export async function put<T = Record<string, unknown>>(store: StoreName, item: T): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    fallbackPut(store, item);
  }
}

export async function putMany<T = Record<string, unknown>>(store: StoreName, items: T[]): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      const os = tx.objectStore(store);
      for (const item of items) os.put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    for (const item of items) fallbackPut(store, item);
  }
}

export async function remove(store: StoreName, id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    fallbackRemove(store, id);
  }
}

export async function clearStore(store: StoreName): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    localStorage.removeItem(`idb_fallback_${store}`);
  }
}

/** Clear ALL offline cache stores */
export async function clearAllStores(): Promise<void> {
  for (const store of STORES) {
    await clearStore(store);
  }
}

/* ─── Timestamp tracking (last sync per store) ─── */

const TIMESTAMP_KEY = 'offline_cache_timestamps';

function loadTimestamps(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(TIMESTAMP_KEY) || '{}');
  } catch {
    return {};
  }
}

export function getLastSyncTime(store: StoreName): Date | null {
  const ts = loadTimestamps();
  return ts[store] ? new Date(ts[store]) : null;
}

export function setLastSyncTime(store: StoreName, date = new Date()): void {
  const ts = loadTimestamps();
  ts[store] = date.toISOString();
  localStorage.setItem(TIMESTAMP_KEY, JSON.stringify(ts));
}

/* ─── localStorage fallbacks ─── */

function fallbackGetAll<T>(store: StoreName): T[] {
  try {
    const raw = localStorage.getItem(`idb_fallback_${store}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function fallbackPut<T>(store: StoreName, item: T): void {
  const all = fallbackGetAll<T & { id: string }>(store);
  const typedItem = item as T & { id: string };
  const idx = all.findIndex((i) => i.id === typedItem.id);
  if (idx >= 0) all[idx] = typedItem;
  else all.push(typedItem);
  localStorage.setItem(`idb_fallback_${store}`, JSON.stringify(all));
}

function fallbackRemove(store: StoreName, id: string): void {
  const all = fallbackGetAll<{ id: string }>(store);
  const filtered = all.filter((i) => i.id !== id);
  localStorage.setItem(`idb_fallback_${store}`, JSON.stringify(filtered));
}
