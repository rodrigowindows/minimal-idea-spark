/**
 * Helpers for goals/OKRs: link opportunities to goals, progress, etc.
 */

import type { Opportunity } from '@/types'

export function getOpportunitiesForGoal(opportunities: Opportunity[], goalId: string): Opportunity[] {
  return opportunities.filter((o) => o.goal_id === goalId)
}

export function countCompletedForGoal(opportunities: Opportunity[], goalId: string): number {
  return opportunities.filter((o) => o.goal_id === goalId && o.status === 'done').length
}
