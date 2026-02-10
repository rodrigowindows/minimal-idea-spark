import { describe, it, expect } from 'vitest'
import {
  getOpportunitiesForGoal,
  countCompletedForGoal,
  getKeyResultProgress,
  calculateGoalProgress,
} from './goal-service'
import type { Opportunity } from '@/types'
import type { Goal, KeyResult } from '@/hooks/useLocalData'

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

  it('getKeyResultProgress returns percentage and caps at 100', () => {
    const kr: KeyResult = { id: 'kr1', title: 'Increase leads', target_value: 10, current_value: 12, unit: 'items', linked_opportunity_ids: [] }
    expect(getKeyResultProgress(kr)).toBe(100)
    expect(getKeyResultProgress({ ...kr, current_value: 5 })).toBe(50)
    expect(getKeyResultProgress({ ...kr, target_value: 0 })).toBe(0)
  })

  it('calculateGoalProgress uses linked opportunities for KR progress', () => {
    const goal: Goal = {
      id: 'goal-1',
      user_id: 'u',
      title: 'Launch beta',
      description: '',
      domain_id: null,
      start_date: '2025-01-01',
      target_date: '2025-03-31',
      cycle: 'Q1',
      status: 'active',
      progress: 0,
      milestones: [],
      final_score: undefined,
      created_at: '',
      key_results: [
        { id: 'kr-1', title: 'Ship features', target_value: 3, current_value: 0, unit: 'items', linked_opportunity_ids: ['1', '2', '3'] },
      ],
    }
    const opps: Opportunity[] = [
      { id: '1', user_id: 'u', domain_id: null, title: 'Feature A', description: null, type: 'action', status: 'done', priority: 5, strategic_value: 5, created_at: '' },
      { id: '2', user_id: 'u', domain_id: null, title: 'Feature B', description: null, type: 'action', status: 'done', priority: 5, strategic_value: 5, created_at: '' },
      { id: '3', user_id: 'u', domain_id: null, title: 'Feature C', description: null, type: 'action', status: 'doing', priority: 5, strategic_value: 5, created_at: '' },
    ]
    // 2 of 3 linked opps are done -> 67%
    expect(calculateGoalProgress(goal, opps)).toBe(67)
  })

  it('calculateGoalProgress falls back to goal opportunities when no KRs', () => {
    const goal: Goal = {
      id: 'goal-2',
      user_id: 'u',
      title: 'Improve health',
      description: '',
      domain_id: null,
      start_date: '2025-01-01',
      target_date: '2025-03-31',
      cycle: 'Q1',
      status: 'active',
      progress: 0,
      milestones: [],
      final_score: undefined,
      created_at: '',
      key_results: [],
    }
    const opps: Opportunity[] = [
      { id: '10', user_id: 'u', domain_id: null, title: 'Run 5k', description: null, type: 'action', status: 'done', priority: 5, strategic_value: 5, created_at: '', goal_id: 'goal-2' },
      { id: '11', user_id: 'u', domain_id: null, title: 'Meal prep', description: null, type: 'action', status: 'doing', priority: 5, strategic_value: 5, created_at: '', goal_id: 'goal-2' },
    ]
    expect(calculateGoalProgress(goal, opps)).toBe(50)
  })
})
