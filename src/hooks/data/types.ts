/**
 * Shared types for the data layer hooks.
 */
import type { Opportunity, DailyLog, LifeDomain } from '@/types'

export type { Opportunity, DailyLog, LifeDomain }

export type OKRCycle = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'S1' | 'S2' | 'annual' | 'custom'
export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low'

export interface KeyResult {
  id: string
  title: string
  target_value: number
  current_value: number
  unit: string
  linked_opportunity_ids: string[]
}

export interface Goal {
  id: string
  user_id: string
  title: string
  description: string
  domain_id: string | null
  target_date: string
  start_date: string
  progress: number
  milestones: { id: string; title: string; done: boolean }[]
  key_results: KeyResult[]
  cycle: OKRCycle
  status: 'active' | 'completed' | 'cancelled'
  priority_level: PriorityLevel
  final_score?: number
  created_at: string
}

export interface Habit {
  id: string
  user_id: string
  name: string
  domain_id: string | null
  frequency: 'daily' | 'weekly'
  target_count: number
  color: string
  created_at: string
  completions: string[]
}

export interface WeeklyTarget {
  domain_id: string
  opportunities_target: number
  hours_target: number
}
