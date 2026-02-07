/**
 * Schema for version history (logical; migrations in Supabase).
 */

export interface VersionRecord {
  id: string
  entity_type: string
  entity_id: string
  content: string
  content_diff?: string
  author_id: string
  comment: string | null
  created_at: string
}

export const ENTITY_TYPES = ['opportunity', 'journal', 'document', 'template'] as const
