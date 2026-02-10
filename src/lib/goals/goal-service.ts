/**
 * Helpers for goals/OKRs: link opportunities to goals, progress calculation, cycle helpers, etc.
 */

import type { Opportunity, OpportunityStatusValue, OpportunityTypeValue } from '@/types'
import type { Goal, KeyResult, OKRCycle } from '@/hooks/useLocalData'
import { differenceInCalendarDays } from 'date-fns'

export function getOpportunitiesForGoal(opportunities: Opportunity[], goalId: string): Opportunity[] {
  return opportunities.filter((o) => o.goal_id === goalId)
}

export function countCompletedForGoal(opportunities: Opportunity[], goalId: string): number {
  return opportunities.filter((o) => o.goal_id === goalId && o.status === 'done').length
}

export function getOpportunitiesForKeyResult(opportunities: Opportunity[], kr: KeyResult): Opportunity[] {
  return opportunities.filter((o) => kr.linked_opportunity_ids.includes(o.id))
}

/** Calculate progress of a single key result as 0-100 */
export function getKeyResultProgress(kr: KeyResult): number {
  if (kr.target_value <= 0) return 0
  return Math.min(100, Math.round((kr.current_value / kr.target_value) * 100))
}

/** Calculate overall goal progress from key results (average of KR progress).
 *  Falls back to milestone-based progress if no key results exist. */
export function calculateGoalProgress(goal: Goal, opportunities: Opportunity[]): number {
  if (goal.key_results.length > 0) {
    const totalKRProgress = goal.key_results.reduce((sum, kr) => {
      // Auto-calculate KR progress from linked opportunities if unit is '%' or 'opportunities'
      const linkedOpps = opportunities.filter(o => kr.linked_opportunity_ids.includes(o.id))
      const doneCount = linkedOpps.filter(o => o.status === 'done').length
      if (linkedOpps.length > 0 && kr.target_value > 0) {
        const autoValue = Math.max(kr.current_value, doneCount)
        return sum + Math.min(100, Math.round((autoValue / kr.target_value) * 100))
      }
      return sum + getKeyResultProgress(kr)
    }, 0)
    return Math.round(totalKRProgress / goal.key_results.length)
  }

  // Fallback: milestone-based
  if (goal.milestones.length > 0) {
    const done = goal.milestones.filter(m => m.done).length
    return Math.round((done / goal.milestones.length) * 100)
  }

  // Fallback: opportunity-based
  const goalOpps = getOpportunitiesForGoal(opportunities, goal.id)
  if (goalOpps.length > 0) {
    const done = goalOpps.filter(o => o.status === 'done').length
    return Math.round((done / goalOpps.length) * 100)
  }

  return goal.progress
}

/** Get total linked opportunity count across all key results of a goal */
export function getTotalLinkedOpportunities(goal: Goal): number {
  const uniqueIds = new Set<string>()
  for (const kr of goal.key_results) {
    for (const id of kr.linked_opportunity_ids) {
      uniqueIds.add(id)
    }
  }
  return uniqueIds.size
}

/** Cycle date ranges (defaults to current year) */
export function getCycleDates(cycle: OKRCycle, year?: number): { start: string; end: string } {
  const y = year ?? new Date().getFullYear()
  switch (cycle) {
    case 'Q1': return { start: `${y}-01-01`, end: `${y}-03-31` }
    case 'Q2': return { start: `${y}-04-01`, end: `${y}-06-30` }
    case 'Q3': return { start: `${y}-07-01`, end: `${y}-09-30` }
    case 'Q4': return { start: `${y}-10-01`, end: `${y}-12-31` }
    case 'S1': return { start: `${y}-01-01`, end: `${y}-06-30` }
    case 'S2': return { start: `${y}-07-01`, end: `${y}-12-31` }
    case 'annual': return { start: `${y}-01-01`, end: `${y}-12-31` }
    case 'custom': return { start: `${y}-01-01`, end: `${y}-12-31` }
  }
}

export function getCycleLabel(cycle: OKRCycle): string {
  switch (cycle) {
    case 'Q1': return '1o Trimestre'
    case 'Q2': return '2o Trimestre'
    case 'Q3': return '3o Trimestre'
    case 'Q4': return '4o Trimestre'
    case 'S1': return '1o Semestre'
    case 'S2': return '2o Semestre'
    case 'annual': return 'Anual'
    case 'custom': return 'Personalizado'
  }
}

/** Get current cycle based on today's date */
export function getCurrentCycle(): OKRCycle {
  const month = new Date().getMonth() + 1
  if (month <= 3) return 'Q1'
  if (month <= 6) return 'Q2'
  if (month <= 9) return 'Q3'
  return 'Q4'
}

/** Filter goals by cycle */
export function filterGoalsByCycle(goals: Goal[], cycle: OKRCycle | 'all'): Goal[] {
  if (cycle === 'all') return goals
  return goals.filter(g => g.cycle === cycle)
}

/** Score color for OKR (red < 40, yellow 40-69, green >= 70) */
export function getScoreColor(score: number): string {
  if (score >= 70) return 'text-green-500'
  if (score >= 40) return 'text-yellow-500'
  return 'text-red-500'
}

export function getScoreBgColor(score: number): string {
  if (score >= 70) return 'bg-green-500'
  if (score >= 40) return 'bg-yellow-500'
  return 'bg-red-500'
}

export interface SuggestedOpportunity {
  title: string
  description: string
  type: OpportunityTypeValue
  status: OpportunityStatusValue
  priority: number
  strategic_value: number
  domain_id: string | null
  goal_id?: string | null
}

/** Lightweight “AI-ish” heuristic to suggest next opportunities for a goal. */
export function suggestOpportunitiesForGoal(goal: Goal): SuggestedOpportunity[] {
  const suggestions: SuggestedOpportunity[] = []
  const domainId = goal.domain_id ?? null
  const baseType: OpportunityTypeValue = goal.description?.toLowerCase().includes('study') ? 'study' : 'action'
  const daysLeft = differenceInCalendarDays(new Date(goal.target_date), new Date())

  // 1) Nudge key results forward
  for (const kr of goal.key_results.slice(0, 2)) {
    suggestions.push({
      title: `Advance KR: ${kr.title}`,
      description: `Move the key result “${kr.title}” forward for “${goal.title}” by completing the next concrete step.`,
      type: baseType,
      status: 'backlog',
      priority: 8,
      strategic_value: 8,
      domain_id: domainId,
      goal_id: goal.id,
    })
  }

  // 2) Turn milestones into tasks (prioritise pending ones)
  const pendingMilestones = goal.milestones.filter((m) => !m.done)
  for (const ms of pendingMilestones.slice(0, 2)) {
    suggestions.push({
      title: `Complete milestone: ${ms.title}`,
      description: `Deliver the milestone “${ms.title}” to unlock progress toward “${goal.title}”.`,
      type: baseType,
      status: 'backlog',
      priority: 7,
      strategic_value: 7,
      domain_id: domainId,
      goal_id: goal.id,
    })
  }

  // 3) Default planning / retro tasks
  if (suggestions.length < 3) {
    suggestions.push({
      title: `Plan next ${Math.max(1, Math.min(2, Math.ceil(daysLeft / 14)))} weeks`,
      description: `Create a short action plan for the upcoming weeks to keep “${goal.title}” on track.`,
      type: 'action',
      status: 'backlog',
      priority: 6,
      strategic_value: 6,
      domain_id: domainId,
      goal_id: goal.id,
    })
  }

  // Deduplicate by title and limit to three items
  const unique = new Map<string, SuggestedOpportunity>()
  for (const s of suggestions) {
    if (!unique.has(s.title)) unique.set(s.title, s)
  }
  return Array.from(unique.values()).slice(0, 3)
}
