/**
 * Types for the external import system (Markdown, Notion, Obsidian).
 */

export type ImportSource = 'markdown' | 'notion-csv' | 'notion-html' | 'obsidian'

export type ImportTargetType = 'opportunity' | 'journal' | 'knowledge'

export interface ImportedItem {
  id: string
  source: ImportSource
  targetType: ImportTargetType
  title: string
  content: string
  date?: string
  tags?: string[]
  /** Obsidian internal links [[Page Name]] found in content */
  internalLinks?: string[]
  /** Original file name if from multi-file import */
  sourceFile?: string
  /** Whether this item was detected as a potential duplicate */
  isDuplicate?: boolean
  /** Title of the existing item it may duplicate */
  duplicateOf?: string
  /** Whether user chose to skip this item */
  skipped?: boolean
  /** Attached images/files extracted from content */
  attachments?: ImportAttachment[]
}

export interface ImportAttachment {
  name: string
  file: File
  /** Data URL for preview */
  previewUrl?: string
}

export interface ImportOptions {
  /** Import as draft (backlog) or preserve original dates */
  importAsDraft: boolean
  /** Target type for items without explicit type */
  defaultTarget: ImportTargetType
  /** Domain ID to assign to opportunities */
  domainId: string | null
  /** How to handle duplicates: ask, skip, or merge */
  duplicateStrategy: 'ask' | 'skip' | 'merge'
}

export interface ImportResult {
  created: number
  skipped: number
  errors: string[]
  /** IDs of created items for rollback */
  createdIds: string[]
}

export interface ImportSession {
  id: string
  source: ImportSource
  startedAt: string
  result: ImportResult | null
  /** Whether the session can still be rolled back */
  canRollback: boolean
}

export const DEFAULT_IMPORT_OPTIONS: ImportOptions = {
  importAsDraft: true,
  defaultTarget: 'opportunity',
  domainId: null,
  duplicateStrategy: 'ask',
}
