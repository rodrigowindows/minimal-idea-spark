import { useState, useCallback, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { calculateGoalProgress } from '@/lib/goals/goal-service'
import type { Goal, KeyResult, OKRCycle } from './types'
import type { Opportunity } from '@/types'

/**
 * Goals/OKR — synced with Supabase `goals` table.
 */
export function useGoals(opportunities: Opportunity[]) {
  const { user } = useAuth()
  const userId = user?.id ?? 'local'
  const initialLoadDone = useRef(false)

  const [goals, setGoals] = useState<Goal[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user || initialLoadDone.current) return
    initialLoadDone.current = true

    async function load() {
      try {
        const { data, error } = await supabase
          .from('goals')
          .select('*')
          .order('created_at', { ascending: false })
        if (!error && data) {
          setGoals(data.map(g => ({
            id: g.id,
            user_id: g.user_id,
            title: g.title,
            description: g.description,
            domain_id: g.domain_id,
            target_date: g.target_date,
            start_date: g.start_date,
            progress: g.progress,
            milestones: (g.milestones as any) ?? [],
            key_results: (g.key_results as any) ?? [],
            cycle: g.cycle as OKRCycle,
            status: g.status as Goal['status'],
            final_score: g.final_score ?? undefined,
            created_at: g.created_at,
          })))
        }
      } catch { /* ignore */ }
      setIsLoading(false)
    }
    load()
  }, [user])

  const persistGoal = useCallback((goal: Goal) => {
    const { created_at, ...rest } = goal
    supabase.from('goals').upsert({
      ...rest,
      milestones: rest.milestones as any,
      key_results: rest.key_results as any,
      final_score: rest.final_score ?? null,
      updated_at: new Date().toISOString(),
    }).then(({ error }) => { if (error) console.error('[persistGoal]', error) })
  }, [])

  const addGoal = useCallback((data: Omit<Goal, 'id' | 'user_id' | 'created_at'>) => {
    const newGoal: Goal = {
      key_results: [],
      cycle: 'custom' as OKRCycle,
      status: 'active',
      start_date: new Date().toISOString().split('T')[0],
      ...data,
      id: crypto.randomUUID(),
      user_id: userId,
      created_at: new Date().toISOString(),
    }
    setGoals(prev => [newGoal, ...prev])
    persistGoal(newGoal)
    return newGoal
  }, [userId, persistGoal])

  const updateGoal = useCallback((id: string, data: Partial<Goal>) => {
    setGoals(prev => {
      const updated = prev.map(g => g.id === id ? { ...g, ...data } : g)
      const goal = updated.find(g => g.id === id)
      if (goal) persistGoal(goal)
      return updated
    })
  }, [persistGoal])

  const toggleMilestone = useCallback((goalId: string, milestoneId: string) => {
    setGoals(prev => {
      const updated = prev.map(g => {
        if (g.id !== goalId) return g
        const milestones = g.milestones.map(m =>
          m.id === milestoneId ? { ...m, done: !m.done } : m
        )
        const doneMilestones = milestones.filter(m => m.done).length
        const progress = milestones.length > 0
          ? Math.round((doneMilestones / milestones.length) * 100)
          : g.progress
        return { ...g, milestones, progress }
      })
      const goal = updated.find(g => g.id === goalId)
      if (goal) persistGoal(goal)
      return updated
    })
  }, [persistGoal])

  const addKeyResult = useCallback((goalId: string, kr: Omit<KeyResult, 'id' | 'linked_opportunity_ids'>) => {
    setGoals(prev => {
      const updated = prev.map(g => {
        if (g.id !== goalId) return g
        const newKR: KeyResult = { ...kr, id: `kr-${Date.now()}`, linked_opportunity_ids: [] }
        return { ...g, key_results: [...g.key_results, newKR] }
      })
      const goal = updated.find(g => g.id === goalId)
      if (goal) persistGoal(goal)
      return updated
    })
  }, [persistGoal])

  const updateKeyResult = useCallback((goalId: string, krId: string, data: Partial<KeyResult>) => {
    setGoals(prev => {
      const updated = prev.map(g => {
        if (g.id !== goalId) return g
        const key_results = g.key_results.map(kr => kr.id === krId ? { ...kr, ...data } : kr)
        return { ...g, key_results }
      })
      const goal = updated.find(g => g.id === goalId)
      if (goal) persistGoal(goal)
      return updated
    })
  }, [persistGoal])

  const deleteKeyResult = useCallback((goalId: string, krId: string) => {
    setGoals(prev => {
      const updated = prev.map(g => {
        if (g.id !== goalId) return g
        return { ...g, key_results: g.key_results.filter(kr => kr.id !== krId) }
      })
      const goal = updated.find(g => g.id === goalId)
      if (goal) persistGoal(goal)
      return updated
    })
  }, [persistGoal])

  const linkOpportunityToKeyResult = useCallback((goalId: string, krId: string, opportunityId: string) => {
    setGoals(prev => {
      const updated = prev.map(g => {
        if (g.id !== goalId) return g
        const key_results = g.key_results.map(kr => {
          if (kr.id !== krId || kr.linked_opportunity_ids.includes(opportunityId)) return kr
          return { ...kr, linked_opportunity_ids: [...kr.linked_opportunity_ids, opportunityId] }
        })
        return { ...g, key_results }
      })
      const goal = updated.find(g => g.id === goalId)
      if (goal) persistGoal(goal)
      return updated
    })
  }, [persistGoal])

  const unlinkOpportunityFromKeyResult = useCallback((goalId: string, krId: string, opportunityId: string) => {
    setGoals(prev => {
      const updated = prev.map(g => {
        if (g.id !== goalId) return g
        const key_results = g.key_results.map(kr => {
          if (kr.id !== krId) return kr
          return { ...kr, linked_opportunity_ids: kr.linked_opportunity_ids.filter(id => id !== opportunityId) }
        })
        return { ...g, key_results }
      })
      const goal = updated.find(g => g.id === goalId)
      if (goal) persistGoal(goal)
      return updated
    })
  }, [persistGoal])

  const completeGoal = useCallback((goalId: string) => {
    setGoals(prev => {
      const updated = prev.map(g => {
        if (g.id !== goalId) return g
        const progress = calculateGoalProgress(g, opportunities)
        return { ...g, status: 'completed' as const, progress: 100, final_score: progress }
      })
      const goal = updated.find(g => g.id === goalId)
      if (goal) persistGoal(goal)
      return updated
    })
  }, [opportunities, persistGoal])

  const cancelGoal = useCallback((goalId: string) => {
    setGoals(prev => {
      const updated = prev.map(g => {
        if (g.id !== goalId) return g
        const progress = calculateGoalProgress(g, opportunities)
        return { ...g, status: 'cancelled' as const, final_score: progress, progress }
      })
      const goal = updated.find(g => g.id === goalId)
      if (goal) persistGoal(goal)
      return updated
    })
  }, [opportunities, persistGoal])

  const deleteGoal = useCallback((id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id))
    supabase.from('goals').delete().eq('id', id).then(({ error }) => {
      if (error) console.error('[deleteGoal]', error)
    })
  }, [])

  return {
    goals, isLoading,
    addGoal, updateGoal, toggleMilestone, deleteGoal,
    addKeyResult, updateKeyResult, deleteKeyResult,
    linkOpportunityToKeyResult, unlinkOpportunityFromKeyResult,
    completeGoal, cancelGoal,
  }
}
