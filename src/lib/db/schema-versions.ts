/**
 * Schema for version history system (Git-like version control for app content).
 */

export const ENTITY_TYPES = ['opportunity', 'journal', 'goal', 'habit', 'document', 'template'] as const
export type EntityType = (typeof ENTITY_TYPES)[number]

export interface VersionRecord {
  id: string
  entity_type: EntityType
  entity_id: string
  content: string
  content_diff?: string
  author_id: string
  comment: string | null
  branch: string
  parent_id: string | null
  tags: string[]
  created_at: string
}

export interface BranchInfo {
  name: string
  created_at: string
  source_snapshot_id: string | null
  entity_type: EntityType
  entity_id: string
  description?: string
}

export interface VersionCompare {
  left: VersionRecord
  right: VersionRecord
}

export interface VersionExport {
  exported_at: string
  entity_type: EntityType
  entity_id: string
  branch: string
  snapshots: VersionRecord[]
  branches: BranchInfo[]
}

export const STORAGE_KEYS = {
  snapshots: 'lifeos_version_snapshots',
  branches: 'lifeos_version_branches',
} as const

export const MAX_SNAPSHOTS = 1000

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  opportunity: 'Opportunities',
  journal: 'Journal Entries',
  goal: 'Goals',
  habit: 'Habits',
  document: 'Documents',
  template: 'Templates',
}
