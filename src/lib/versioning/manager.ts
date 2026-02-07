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
  branch?: string
}

const STORAGE_KEY = 'minimal_idea_spark_versions'

export function getStoredSnapshots(entityType: string, entityId: string, branch?: string): VersionSnapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const all: VersionSnapshot[] = raw ? JSON.parse(raw) : []
    let list = all.filter(s => s.entityType === entityType && s.entityId === entityId)
    if (branch) list = list.filter(s => (s.branch ?? 'main') === branch)
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  } catch {
    return []
  }
}

export function createSnapshot(
  entityType: string,
  entityId: string,
  content: string,
  comment?: string,
  branch?: string
): VersionSnapshot {
  const raw = localStorage.getItem(STORAGE_KEY)
  const all: VersionSnapshot[] = raw ? JSON.parse(raw) : []
  const snap: VersionSnapshot = {
    id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    entityType,
    entityId,
    content,
    createdAt: new Date().toISOString(),
    comment,
    branch: branch ?? 'main',
  }
  all.push(snap)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all.slice(-500)))
  return snap
}

export function getBranches(entityType: string, entityId: string): string[] {
  const snapshots = getStoredSnapshots(entityType, entityId)
  const branches = new Set(snapshots.map(s => s.branch ?? 'main'))
  return Array.from(branches).sort()
}

export function exportHistoryAsJson(snapshots: VersionSnapshot[]): string {
  return JSON.stringify(snapshots, null, 2)
}

export function createBranchFromSnapshot(snapshotId: string, branchName: string): VersionSnapshot | null {
  const snap = getSnapshot(snapshotId)
  if (!snap) return null
  return createSnapshot(snap.entityType, snap.entityId, snap.content, `Branch: ${branchName}`, branchName)
}

export function getSnapshot(id: string): VersionSnapshot | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  const all: VersionSnapshot[] = raw ? JSON.parse(raw) : []
  return all.find(s => s.id === id) ?? null
}
