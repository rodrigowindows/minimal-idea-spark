/**
 * Schema/types for templates (logical schema; migrations may live in Supabase).
 */

export interface Template {
  id: string
  user_id: string
  organization_id?: string
  name: string
  description: string | null
  body: string
  category: string
  is_public: boolean
  version: number
  created_at: string
  updated_at: string
}

export interface TemplateVariable {
  key: string
  label: string
  default?: string
}

export const TEMPLATE_CATEGORIES = ['project', 'task', 'journal', 'meeting', 'other'] as const
