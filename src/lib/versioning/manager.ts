/**
 * Version/snapshot manager for content (Git-like history).
 */

export interface VersionSnapshot {
  id: string
  entityType: string
  entityId: string
  content: string
  createdAt: string
  authorId?: string
  comment?: string
}

const STORAGE_KEY = 'minimal_idea_spark_versions'

export function getStoredSnapshots(entityType: string, entityId: string): VersionSnapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const all: VersionSnapshot[] = raw ? JSON.parse(raw) : []
    return all.filter(s => s.entityType === entityType && s.entityId === entityId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  } catch {
    return []
  }
}

export function createSnapshot(entityType: string, entityId: string, content: string, comment?: string): VersionSnapshot {
  const raw = localStorage.getItem(STORAGE_KEY)
  const all: VersionSnapshot[] = raw ? JSON.parse(raw) : []
  const snap: VersionSnapshot = {
    id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    entityType,
    entityId,
    content,
    createdAt: new Date().toISOString(),
    comment,
  }
  all.push(snap)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all.slice(-500)))
  return snap
}

export function getSnapshot(id: string): VersionSnapshot | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  const all: VersionSnapshot[] = raw ? JSON.parse(raw) : []
  return all.find(s => s.id === id) ?? null
}
