/**
 * Persists localId → serverId mapping after successful create sync.
 * Used by sync-processor so update/delete of offline-created items use the correct server id.
 */

const STORAGE_KEY = 'pwa_sync_id_map_v1';

type EntityKind = 'opportunity' | 'daily_log';

function loadMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveMap(map: Record<string, string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

function key(kind: EntityKind, localId: string): string {
  return `${kind}:${localId}`;
}

export function saveServerId(kind: EntityKind, localId: string, serverId: string): void {
  const map = loadMap();
  map[key(kind, localId)] = serverId;
  saveMap(map);
}

export function getServerId(kind: EntityKind, localId: string): string | null {
  const map = loadMap();
  return map[key(kind, localId)] ?? null;
}

export function removeMapping(kind: EntityKind, localId: string): void {
  const map = loadMap();
  delete map[key(kind, localId)];
  saveMap(map);
}

/** Clear all mappings (e.g. from Settings "clear sync data"). */
export function clearAllMappings(): void {
  localStorage.removeItem(STORAGE_KEY);
}
