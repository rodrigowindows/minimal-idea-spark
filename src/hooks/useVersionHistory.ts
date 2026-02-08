import { useState, useCallback, useMemo } from 'react'
import {
  getStoredSnapshots,
  getBranches,
  getBranchInfo,
  createSnapshot,
  createBranchFromSnapshot,
  deleteBranch,
  mergeBranch,
  restoreSnapshot,
  deleteSnapshot,
  searchSnapshots,
  getTrackedEntities,
  exportFullHistory,
  importHistory,
  updateSnapshotComment,
  addTagToSnapshot,
  removeTagFromSnapshot,
  type VersionSnapshot,
} from '@/lib/versioning/manager'
import type { EntityType } from '@/lib/db/schema-versions'

export function useVersionHistory(
  initialEntityType: EntityType = 'journal',
  initialEntityId: string = 'default',
) {
  const [entityType, setEntityType] = useState<EntityType>(initialEntityType)
  const [entityId, setEntityId] = useState(initialEntityId)
  const [branch, setBranch] = useState('main')
  const [revision, setRevision] = useState(0)

  const refresh = useCallback(() => setRevision(r => r + 1), [])

  const snapshots = useMemo(
    () => getStoredSnapshots(entityType, entityId, branch),
    [entityType, entityId, branch, revision],
  )

  const branches = useMemo(
    () => getBranches(entityType, entityId),
    [entityType, entityId, revision],
  )

  const branchInfos = useMemo(
    () => getBranchInfo(entityType, entityId),
    [entityType, entityId, revision],
  )

  const trackedEntities = useMemo(() => getTrackedEntities(), [revision])

  const doCreateSnapshot = useCallback(
    (content: string, comment?: string, tags?: string[]) => {
      const snap = createSnapshot(entityType, entityId, content, comment, branch, tags)
      refresh()
      return snap
    },
    [entityType, entityId, branch, refresh],
  )

  const doRestore = useCallback(
    (snapshotId: string) => {
      const snap = restoreSnapshot(snapshotId)
      refresh()
      return snap
    },
    [refresh],
  )

  const doDelete = useCallback(
    (snapshotId: string) => {
      const ok = deleteSnapshot(snapshotId)
      if (ok) refresh()
      return ok
    },
    [refresh],
  )

  const doCreateBranch = useCallback(
    (snapshotId: string, name: string, description?: string) => {
      const snap = createBranchFromSnapshot(snapshotId, name, description)
      if (snap) {
        setBranch(name)
        refresh()
      }
      return snap
    },
    [refresh],
  )

  const doDeleteBranch = useCallback(
    (name: string) => {
      const ok = deleteBranch(entityType, entityId, name)
      if (ok && branch === name) setBranch('main')
      refresh()
      return ok
    },
    [entityType, entityId, branch, refresh],
  )

  const doMerge = useCallback(
    (from: string, to: string) => {
      const snap = mergeBranch(entityType, entityId, from, to)
      if (snap) {
        setBranch(to)
        refresh()
      }
      return snap
    },
    [entityType, entityId, refresh],
  )

  const doSearch = useCallback(
    (query: string) => searchSnapshots(query, entityType),
    [entityType],
  )

  const doExport = useCallback(
    () => exportFullHistory(entityType, entityId, branch),
    [entityType, entityId, branch],
  )

  const doImport = useCallback(
    (json: string) => {
      const result = importHistory(json)
      refresh()
      return result
    },
    [refresh],
  )

  const doUpdateComment = useCallback(
    (snapshotId: string, comment: string) => {
      const ok = updateSnapshotComment(snapshotId, comment)
      if (ok) refresh()
      return ok
    },
    [refresh],
  )

  const doAddTag = useCallback(
    (snapshotId: string, tag: string) => {
      const ok = addTagToSnapshot(snapshotId, tag)
      if (ok) refresh()
      return ok
    },
    [refresh],
  )

  const doRemoveTag = useCallback(
    (snapshotId: string, tag: string) => {
      const ok = removeTagFromSnapshot(snapshotId, tag)
      if (ok) refresh()
      return ok
    },
    [refresh],
  )

  const selectEntity = useCallback((type: EntityType, id: string) => {
    setEntityType(type)
    setEntityId(id)
    setBranch('main')
  }, [])

  return {
    // Current selection
    entityType,
    entityId,
    branch,
    setEntityType,
    setEntityId,
    setBranch,
    selectEntity,

    // Data
    snapshots,
    branches,
    branchInfos,
    trackedEntities,

    // Actions
    createSnapshot: doCreateSnapshot,
    restoreSnapshot: doRestore,
    deleteSnapshot: doDelete,
    createBranch: doCreateBranch,
    deleteBranch: doDeleteBranch,
    mergeBranch: doMerge,
    search: doSearch,
    exportHistory: doExport,
    importHistory: doImport,
    updateComment: doUpdateComment,
    addTag: doAddTag,
    removeTag: doRemoveTag,
    refresh,
  }
}
