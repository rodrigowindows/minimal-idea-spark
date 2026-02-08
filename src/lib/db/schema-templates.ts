/**
 * Schema/types for templates (logical schema; migrations may live in Supabase).
 */

export const TEMPLATE_CATEGORIES = ['project', 'task', 'journal', 'meeting', 'document', 'other'] as const
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number]

export interface TemplateVariable {
  key: string
  label: string
  default?: string
  type?: 'text' | 'date' | 'number' | 'select'
  options?: string[]
}

export interface TemplateVersion {
  version: number
  body: string
  updated_at: string
}

export interface Template {
  id: string
  user_id: string
  organization_id?: string
  name: string
  description: string | null
  body: string
  category: TemplateCategory
  tags: string[]
  is_public: boolean
  version: number
  versions: TemplateVersion[]
  variables: TemplateVariable[]
  downloads: number
  rating: number
  author_name?: string
  created_at: string
  updated_at: string
}

export interface MarketplaceTemplate {
  id: string
  name: string
  description: string | null
  body: string
  category: TemplateCategory
  tags: string[]
  author_name: string
  downloads: number
  rating: number
  version: number
  created_at: string
}

export const STORAGE_KEY_TEMPLATES = 'lifeos_templates'

export function createEmptyTemplate(userId: string): Template {
  const now = new Date().toISOString()
  return {
    id: `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    user_id: userId,
    name: '',
    description: null,
    body: '# {{title}}\nDate: {{date}}\n\n{{content}}',
    category: 'other',
    tags: [],
    is_public: false,
    version: 1,
    versions: [],
    variables: [],
    downloads: 0,
    rating: 0,
    created_at: now,
    updated_at: now,
  }
}

/** Built-in marketplace templates that simulate community contributions */
export const MARKETPLACE_TEMPLATES: MarketplaceTemplate[] = [
  {
    id: 'mkt-001',
    name: 'Daily Standup Report',
    description: 'Quick daily standup template with yesterday, today, and blockers sections.',
    body: '## Daily Standup - {{date}}\n\n### Done Yesterday\n{{done}}\n\n### Today\'s Focus\n{{today}}\n\n### Blockers\n{{blockers}}',
    category: 'meeting',
    tags: ['agile', 'daily', 'standup'],
    author_name: 'Canvas Team',
    downloads: 342,
    rating: 4.8,
    version: 3,
    created_at: '2025-10-01T00:00:00Z',
  },
  {
    id: 'mkt-002',
    name: 'Project Kickoff',
    description: 'Comprehensive project kickoff document with goals, timeline, and stakeholders.',
    body: '# {{title}} - Project Kickoff\n\n**Domain:** {{domain}}\n**Date:** {{date}}\n**Lead:** {{lead}}\n\n## Goal\n{{goal}}\n\n## Timeline\n- Start: {{start_date}}\n- End: {{end_date}}\n\n## Stakeholders\n{{stakeholders}}\n\n## Success Criteria\n{{criteria}}\n\n## Risks & Mitigations\n{{risks}}',
    category: 'project',
    tags: ['kickoff', 'planning', 'project-management'],
    author_name: 'Canvas Team',
    downloads: 578,
    rating: 4.9,
    version: 5,
    created_at: '2025-09-15T00:00:00Z',
  },
  {
    id: 'mkt-003',
    name: 'Weekly Review',
    description: 'End-of-week reflection and planning for the next week.',
    body: '# Weekly Review - {{date}}\n\n## Wins This Week\n{{wins}}\n\n## Challenges\n{{challenges}}\n\n## Lessons Learned\n{{lessons}}\n\n## Next Week Priorities\n1. {{priority_1}}\n2. {{priority_2}}\n3. {{priority_3}}\n\n## Energy Level: {{energy}}/10\n## Mood: {{mood}}',
    category: 'journal',
    tags: ['review', 'reflection', 'weekly'],
    author_name: 'Productivity Hub',
    downloads: 891,
    rating: 4.7,
    version: 2,
    created_at: '2025-08-20T00:00:00Z',
  },
  {
    id: 'mkt-004',
    name: 'Task Breakdown',
    description: 'Break down a complex task into subtasks with time estimates.',
    body: '## Task: {{title}}\n**Priority:** {{priority}}\n**Due:** {{date}}\n**Domain:** {{domain}}\n\n### Subtasks\n- [ ] {{subtask_1}} (~{{time_1}})\n- [ ] {{subtask_2}} (~{{time_2}})\n- [ ] {{subtask_3}} (~{{time_3}})\n\n### Notes\n{{notes}}\n\n### Definition of Done\n{{done_criteria}}',
    category: 'task',
    tags: ['breakdown', 'planning', 'subtasks'],
    author_name: 'Canvas Team',
    downloads: 456,
    rating: 4.6,
    version: 2,
    created_at: '2025-09-01T00:00:00Z',
  },
  {
    id: 'mkt-005',
    name: 'Meeting Notes',
    description: 'Structured meeting notes with attendees, decisions, and action items.',
    body: '# Meeting: {{title}}\n**Date:** {{date}}\n**Attendees:** {{attendees}}\n\n## Agenda\n{{agenda}}\n\n## Discussion\n{{notes}}\n\n## Decisions\n{{decisions}}\n\n## Action Items\n- [ ] {{action_1}} - Owner: {{owner_1}}\n- [ ] {{action_2}} - Owner: {{owner_2}}',
    category: 'meeting',
    tags: ['meeting', 'notes', 'action-items'],
    author_name: 'Productivity Hub',
    downloads: 723,
    rating: 4.8,
    version: 4,
    created_at: '2025-07-10T00:00:00Z',
  },
  {
    id: 'mkt-006',
    name: 'Goal Setting (SMART)',
    description: 'SMART goal framework template for clear, actionable goals.',
    body: '# Goal: {{title}}\n\n## SMART Breakdown\n\n**Specific:** {{specific}}\n**Measurable:** {{measurable}}\n**Achievable:** {{achievable}}\n**Relevant:** {{relevant}}\n**Time-bound:** {{deadline}}\n\n## Action Steps\n1. {{step_1}}\n2. {{step_2}}\n3. {{step_3}}\n\n## Progress Tracking\n- Week 1: {{week_1_target}}\n- Week 2: {{week_2_target}}\n- Week 3: {{week_3_target}}\n- Week 4: {{week_4_target}}',
    category: 'project',
    tags: ['goals', 'SMART', 'planning'],
    author_name: 'Goal Setter Pro',
    downloads: 1024,
    rating: 4.9,
    version: 3,
    created_at: '2025-06-01T00:00:00Z',
  },
  {
    id: 'mkt-007',
    name: 'Gratitude Journal Entry',
    description: 'Daily gratitude practice with prompts for positivity and growth.',
    body: '# Gratitude Journal - {{date}}\n\n## Three Things I\'m Grateful For\n1. {{grateful_1}}\n2. {{grateful_2}}\n3. {{grateful_3}}\n\n## Today\'s Win\n{{win}}\n\n## What I Learned\n{{learned}}\n\n## Tomorrow\'s Intention\n{{intention}}',
    category: 'journal',
    tags: ['gratitude', 'mindfulness', 'daily'],
    author_name: 'Mindful Living',
    downloads: 654,
    rating: 4.5,
    version: 1,
    created_at: '2025-10-15T00:00:00Z',
  },
  {
    id: 'mkt-008',
    name: 'Decision Log',
    description: 'Document important decisions with context, options, and rationale.',
    body: '# Decision: {{title}}\n**Date:** {{date}}\n**Status:** {{status}}\n\n## Context\n{{context}}\n\n## Options Considered\n1. {{option_1}} - Pros: {{pros_1}} / Cons: {{cons_1}}\n2. {{option_2}} - Pros: {{pros_2}} / Cons: {{cons_2}}\n\n## Decision\n{{decision}}\n\n## Rationale\n{{rationale}}\n\n## Expected Outcome\n{{outcome}}',
    category: 'document',
    tags: ['decision', 'analysis', 'documentation'],
    author_name: 'Canvas Team',
    downloads: 312,
    rating: 4.4,
    version: 2,
    created_at: '2025-11-01T00:00:00Z',
  },
  {
    id: 'mkt-009',
    name: 'Sprint Retrospective',
    description: 'Agile sprint retrospective with what went well, improvements, and actions.',
    body: '# Sprint {{sprint_number}} Retrospective\n**Date:** {{date}}\n**Team:** {{team}}\n\n## What Went Well\n{{went_well}}\n\n## What Could Be Improved\n{{improvements}}\n\n## Action Items\n- [ ] {{action_1}}\n- [ ] {{action_2}}\n- [ ] {{action_3}}\n\n## Team Mood: {{team_mood}}/10',
    category: 'meeting',
    tags: ['agile', 'retrospective', 'sprint'],
    author_name: 'Agile Coach Pro',
    downloads: 487,
    rating: 4.7,
    version: 3,
    created_at: '2025-08-01T00:00:00Z',
  },
  {
    id: 'mkt-010',
    name: 'Content Brief',
    description: 'Content creation brief with audience, tone, and key messages.',
    body: '# Content Brief: {{title}}\n\n**Type:** {{content_type}}\n**Target Audience:** {{audience}}\n**Tone:** {{tone}}\n**Due Date:** {{date}}\n\n## Key Messages\n1. {{message_1}}\n2. {{message_2}}\n3. {{message_3}}\n\n## Outline\n{{outline}}\n\n## References\n{{references}}\n\n## SEO Keywords\n{{keywords}}',
    category: 'document',
    tags: ['content', 'marketing', 'brief'],
    author_name: 'Content Studio',
    downloads: 389,
    rating: 4.3,
    version: 2,
    created_at: '2025-09-20T00:00:00Z',
  },
]
