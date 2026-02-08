/**
 * Git-like version/snapshot manager for app content.
 * Supports branches, comments, tags, diff, restore, and export.
 */

import type { EntityType, BranchInfo, VersionExport } from '@/lib/db/schema-versions'
import { STORAGE_KEYS, MAX_SNAPSHOTS } from '@/lib/db/schema-versions'

export interface VersionSnapshot {
  id: string
  entityType: EntityType
  entityId: string
  content: string
  createdAt: string
  authorId: string
  comment: string | null
  branch: string
  parentId: string | null
  tags: string[]
}

// ---------- helpers ----------

function loadAll(): VersionSnapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.snapshots)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveAll(list: VersionSnapshot[]) {
  localStorage.setItem(STORAGE_KEYS.snapshots, JSON.stringify(list.slice(-MAX_SNAPSHOTS)))
}

function loadBranches(): BranchInfo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.branches)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveBranches(list: BranchInfo[]) {
  localStorage.setItem(STORAGE_KEYS.branches, JSON.stringify(list))
}

function generateId(): string {
  return `v-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// ---------- snapshots ----------

export function getStoredSnapshots(entityType: string, entityId: string, branch?: string): VersionSnapshot[] {
  const all = loadAll()
  let list = all.filter(s => s.entityType === entityType && s.entityId === entityId)
  if (branch) list = list.filter(s => s.branch === branch)
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function getAllSnapshots(): VersionSnapshot[] {
  return loadAll().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function getSnapshot(id: string): VersionSnapshot | null {
  return loadAll().find(s => s.id === id) ?? null
}

export function createSnapshot(
  entityType: EntityType,
  entityId: string,
  content: string,
  comment?: string,
  branch?: string,
  tags?: string[],
  authorId?: string,
): VersionSnapshot {
  const all = loadAll()
  const existing = all.filter(s => s.entityType === entityType && s.entityId === entityId && s.branch === (branch ?? 'main'))
  const parentId = existing.length > 0
    ? existing.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].id
    : null

  const snap: VersionSnapshot = {
    id: generateId(),
    entityType,
    entityId,
    content,
    createdAt: new Date().toISOString(),
    authorId: authorId ?? 'mock-user-001',
    comment: comment ?? null,
    branch: branch ?? 'main',
    parentId,
    tags: tags ?? [],
  }
  all.push(snap)
  saveAll(all)

  // Ensure branch exists
  const branches = loadBranches()
  const branchKey = `${entityType}:${entityId}:${snap.branch}`
  if (!branches.find(b => `${b.entity_type}:${b.entity_id}:${b.name}` === branchKey)) {
    branches.push({
      name: snap.branch,
      created_at: snap.createdAt,
      source_snapshot_id: null,
      entity_type: entityType,
      entity_id: entityId,
    })
    saveBranches(branches)
  }

  return snap
}

export function updateSnapshotComment(id: string, comment: string): boolean {
  const all = loadAll()
  const idx = all.findIndex(s => s.id === id)
  if (idx === -1) return false
  all[idx].comment = comment
  saveAll(all)
  return true
}

export function addTagToSnapshot(id: string, tag: string): boolean {
  const all = loadAll()
  const idx = all.findIndex(s => s.id === id)
  if (idx === -1) return false
  if (!all[idx].tags.includes(tag)) {
    all[idx].tags.push(tag)
    saveAll(all)
  }
  return true
}

export function removeTagFromSnapshot(id: string, tag: string): boolean {
  const all = loadAll()
  const idx = all.findIndex(s => s.id === id)
  if (idx === -1) return false
  all[idx].tags = all[idx].tags.filter(t => t !== tag)
  saveAll(all)
  return true
}

export function deleteSnapshot(id: string): boolean {
  const all = loadAll()
  const filtered = all.filter(s => s.id !== id)
  if (filtered.length === all.length) return false
  saveAll(filtered)
  return true
}

// ---------- branches ----------

export function getBranches(entityType: string, entityId: string): string[] {
  const snapshots = loadAll().filter(s => s.entityType === entityType && s.entityId === entityId)
  const branchSet = new Set(snapshots.map(s => s.branch))
  branchSet.add('main')
  return Array.from(branchSet).sort((a, b) => {
    if (a === 'main') return -1
    if (b === 'main') return 1
    return a.localeCompare(b)
  })
}

export function getBranchInfo(entityType: string, entityId: string): BranchInfo[] {
  const branches = loadBranches()
  return branches.filter(b => b.entity_type === entityType && b.entity_id === entityId)
}

export function createBranchFromSnapshot(snapshotId: string, branchName: string, description?: string): VersionSnapshot | null {
  const snap = getSnapshot(snapshotId)
  if (!snap) return null

  const branches = loadBranches()
  branches.push({
    name: branchName,
    created_at: new Date().toISOString(),
    source_snapshot_id: snapshotId,
    entity_type: snap.entityType,
    entity_id: snap.entityId,
    description,
  })
  saveBranches(branches)

  return createSnapshot(
    snap.entityType,
    snap.entityId,
    snap.content,
    `Branch created from: ${snap.comment ?? snap.id}`,
    branchName,
    snap.tags,
    snap.authorId,
  )
}

export function deleteBranch(entityType: string, entityId: string, branchName: string): boolean {
  if (branchName === 'main') return false
  const all = loadAll()
  const filtered = all.filter(s => !(s.entityType === entityType && s.entityId === entityId && s.branch === branchName))
  saveAll(filtered)
  const branches = loadBranches()
  const filteredBranches = branches.filter(b => !(b.entity_type === entityType && b.entity_id === entityId && b.name === branchName))
  saveBranches(filteredBranches)
  return true
}

export function mergeBranch(entityType: EntityType, entityId: string, fromBranch: string, toBranch: string): VersionSnapshot | null {
  const fromSnapshots = getStoredSnapshots(entityType, entityId, fromBranch)
  if (fromSnapshots.length === 0) return null
  const latest = fromSnapshots[0]
  return createSnapshot(
    entityType,
    entityId,
    latest.content,
    `Merged from branch "${fromBranch}"`,
    toBranch,
    latest.tags,
    latest.authorId,
  )
}

// ---------- restore ----------

export function restoreSnapshot(snapshotId: string): VersionSnapshot | null {
  const snap = getSnapshot(snapshotId)
  if (!snap) return null
  return createSnapshot(
    snap.entityType,
    snap.entityId,
    snap.content,
    `Restored from version ${snap.id.slice(0, 12)}`,
    snap.branch,
    [],
    snap.authorId,
  )
}

// ---------- diff ----------

export interface DiffLine {
  type: 'add' | 'remove' | 'same'
  text: string
  lineNum?: { old?: number; new?: number }
}

export function computeDiff(oldStr: string, newStr: string): DiffLine[] {
  const oldLines = oldStr.split('\n')
  const newLines = newStr.split('\n')
  const result: DiffLine[] = []

  // LCS-based diff for better accuracy
  const lcs = lcsMatrix(oldLines, newLines)
  let i = oldLines.length
  let j = newLines.length
  const reversed: DiffLine[] = []

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      reversed.push({ type: 'same', text: oldLines[i - 1], lineNum: { old: i, new: j } })
      i--
      j--
    } else if (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
      reversed.push({ type: 'add', text: newLines[j - 1], lineNum: { new: j } })
      j--
    } else if (i > 0) {
      reversed.push({ type: 'remove', text: oldLines[i - 1], lineNum: { old: i } })
      i--
    }
  }

  for (let k = reversed.length - 1; k >= 0; k--) {
    result.push(reversed[k])
  }
  return result
}

function lcsMatrix(a: string[], b: string[]): number[][] {
  const m = a.length
  const n = b.length
  // For performance, cap at 500 lines each
  if (m > 500 || n > 500) return simpleLcsMatrix(a, b)
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }
  return dp
}

function simpleLcsMatrix(a: string[], b: string[]): number[][] {
  // Simplified O(n) approach for large files - just return identity matrix
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= Math.min(n, 50); j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }
  return dp
}

export function getDiffStats(diff: DiffLine[]): { additions: number; deletions: number; unchanged: number } {
  let additions = 0
  let deletions = 0
  let unchanged = 0
  for (const line of diff) {
    if (line.type === 'add') additions++
    else if (line.type === 'remove') deletions++
    else unchanged++
  }
  return { additions, deletions, unchanged }
}

// ---------- search ----------

export function searchSnapshots(query: string, entityType?: string): VersionSnapshot[] {
  const all = loadAll()
  const q = query.toLowerCase()
  return all.filter(s => {
    if (entityType && s.entityType !== entityType) return false
    return (
      s.content.toLowerCase().includes(q) ||
      (s.comment?.toLowerCase().includes(q) ?? false) ||
      s.tags.some(t => t.toLowerCase().includes(q)) ||
      s.branch.toLowerCase().includes(q)
    )
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

// ---------- distinct entities ----------

export function getTrackedEntities(): { entityType: EntityType; entityId: string; count: number; lastUpdated: string }[] {
  const all = loadAll()
  const map = new Map<string, { entityType: EntityType; entityId: string; count: number; lastUpdated: string }>()
  for (const s of all) {
    const key = `${s.entityType}:${s.entityId}`
    const existing = map.get(key)
    if (!existing) {
      map.set(key, { entityType: s.entityType, entityId: s.entityId, count: 1, lastUpdated: s.createdAt })
    } else {
      existing.count++
      if (new Date(s.createdAt) > new Date(existing.lastUpdated)) existing.lastUpdated = s.createdAt
    }
  }
  return Array.from(map.values()).sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
}

// ---------- export ----------

export function exportHistoryAsJson(snapshots: VersionSnapshot[]): string {
  return JSON.stringify(snapshots, null, 2)
}

export function exportFullHistory(entityType: EntityType, entityId: string, branch: string): string {
  const snapshots = getStoredSnapshots(entityType, entityId, branch)
  const branches = getBranchInfo(entityType, entityId)
  const exported: VersionExport = {
    exported_at: new Date().toISOString(),
    entity_type: entityType,
    entity_id: entityId,
    branch,
    snapshots: snapshots.map(s => ({
      id: s.id,
      entity_type: s.entityType,
      entity_id: s.entityId,
      content: s.content,
      author_id: s.authorId,
      comment: s.comment,
      branch: s.branch,
      parent_id: s.parentId,
      tags: s.tags,
      created_at: s.createdAt,
    })),
    branches,
  }
  return JSON.stringify(exported, null, 2)
}

export function importHistory(json: string): { imported: number; errors: string[] } {
  const errors: string[] = []
  let imported = 0
  try {
    const data = JSON.parse(json) as VersionExport
    if (!data.snapshots || !Array.isArray(data.snapshots)) {
      errors.push('Invalid export format: missing snapshots array')
      return { imported, errors }
    }
    const all = loadAll()
    const existingIds = new Set(all.map(s => s.id))
    for (const record of data.snapshots) {
      if (existingIds.has(record.id)) continue
      all.push({
        id: record.id,
        entityType: record.entity_type as EntityType,
        entityId: record.entity_id,
        content: record.content,
        createdAt: record.created_at,
        authorId: record.author_id,
        comment: record.comment,
        branch: record.branch,
        parentId: record.parent_id,
        tags: record.tags ?? [],
      })
      imported++
    }
    saveAll(all)

    if (data.branches) {
      const branches = loadBranches()
      for (const b of data.branches) {
        const key = `${b.entity_type}:${b.entity_id}:${b.name}`
        if (!branches.find(x => `${x.entity_type}:${x.entity_id}:${x.name}` === key)) {
          branches.push(b)
        }
      }
      saveBranches(branches)
    }
  } catch (e) {
    errors.push(`Parse error: ${String(e)}`)
  }
  return { imported, errors }
}
