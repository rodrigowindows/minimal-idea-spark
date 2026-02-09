import { describe, it, expect } from 'vitest'
import { getOpportunitiesForGoal, countCompletedForGoal } from './goal-service'
import type { Opportunity } from '@/types'

describe('goal-service', () => {
  const opportunities: Opportunity[] = [
    { id: '1', user_id: 'u', domain_id: null, title: 'A', description: null, type: 'action', status: 'done', priority: 5, strategic_value: 5, created_at: '', goal_id: 'goal-1' },
    { id: '2', user_id: 'u', domain_id: null, title: 'B', description: null, type: 'action', status: 'doing', priority: 5, strategic_value: 5, created_at: '', goal_id: 'goal-1' },
    { id: '3', user_id: 'u', domain_id: null, title: 'C', description: null, type: 'action', status: 'backlog', priority: 5, strategic_value: 5, created_at: '', goal_id: 'goal-2' },
  ]

  it('getOpportunitiesForGoal returns only opportunities linked to goal', () => {
    expect(getOpportunitiesForGoal(opportunities, 'goal-1')).toHaveLength(2)
    expect(getOpportunitiesForGoal(opportunities, 'goal-2')).toHaveLength(1)
    expect(getOpportunitiesForGoal(opportunities, 'goal-3')).toHaveLength(0)
  })

  it('countCompletedForGoal counts only done status', () => {
    expect(countCompletedForGoal(opportunities, 'goal-1')).toBe(1)
    expect(countCompletedForGoal(opportunities, 'goal-2')).toBe(0)
  })
})
