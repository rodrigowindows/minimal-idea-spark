/**
 * Data layer: opportunities, domains, dailyLogs, habits, goals.
 * Opportunities and dailyLogs sync to Supabase; habits/goals use localStorage.
 * Provides CRUD hooks consumed by all pages.
 */
import { useState, useCallback, useEffect, useRef } from 'react'
import type { DailyLog, LifeDomain, Opportunity } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { calculateGoalProgress } from '@/lib/goals/goal-service'

// ---------- localStorage helpers (for habits/goals/domains) ----------
const STORAGE_KEYS = {
  domains: 'lifeos_domains',
  habits: 'lifeos_habits',
  goals: 'lifeos_goals',
  weeklyTargets: 'lifeos_weekly_targets',
} as const

const defaultDomains: LifeDomain[] = [
  { id: 'domain-career', user_id: 'local', name: 'Career', color_theme: '#4f46e5', target_percentage: 30, created_at: '2025-01-01T00:00:00Z' },
  { id: 'domain-health', user_id: 'local', name: 'Health', color_theme: '#10b981', target_percentage: 25, created_at: '2025-01-01T00:00:00Z' },
  { id: 'domain-finance', user_id: 'local', name: 'Finance', color_theme: '#f59e0b', target_percentage: 20, created_at: '2025-01-01T00:00:00Z' },
  { id: 'domain-learning', user_id: 'local', name: 'Learning', color_theme: '#8b5cf6', target_percentage: 25, created_at: '2025-01-01T00:00:00Z' },
  { id: 'domain-family', user_id: 'local', name: 'Family', color_theme: '#ec4899', target_percentage: 0, created_at: '2025-01-01T00:00:00Z' },
]

function loadFromStorage<T>(key: string, defaults: T): T {
  try {
    const stored = localStorage.getItem(key)
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  return defaults
}

function saveToStorage<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data))
}

// ---------- Types ----------
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

export type OKRCycle = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'S1' | 'S2' | 'annual' | 'custom'

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
  final_score?: number
  created_at: string
}

export interface WeeklyTarget {
  domain_id: string
  opportunities_target: number
  hours_target: number
}

// ---------- Hook ----------
export function useLocalData() {
  const { user } = useAuth()
  const userId = user?.id ?? 'local'
  const initialLoadDone = useRef(false)

  // ===== Supabase-backed state =====
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // ===== localStorage-backed state =====
  const [domains, setDomains] = useState<LifeDomain[]>(() => loadFromStorage(STORAGE_KEYS.domains, defaultDomains))
  const [habits, setHabits] = useState<Habit[]>(() => loadFromStorage(STORAGE_KEYS.habits, []))
  const [goals, setGoals] = useState<Goal[]>(() => loadFromStorage(STORAGE_KEYS.goals, []))
  const [weeklyTargets, setWeeklyTargets] = useState<WeeklyTarget[]>(() => loadFromStorage(STORAGE_KEYS.weeklyTargets, []))

  // Persist localStorage items
  useEffect(() => { saveToStorage(STORAGE_KEYS.domains, domains) }, [domains])
  useEffect(() => { saveToStorage(STORAGE_KEYS.habits, habits) }, [habits])
  useEffect(() => { saveToStorage(STORAGE_KEYS.goals, goals) }, [goals])
  useEffect(() => { saveToStorage(STORAGE_KEYS.weeklyTargets, weeklyTargets) }, [weeklyTargets])

  // ===== Fetch from Supabase on mount =====
  useEffect(() => {
    if (!user || initialLoadDone.current) return
    initialLoadDone.current = true

    async function loadData() {
      setIsLoading(true)
      try {
        const [oppRes, logRes] = await Promise.all([
          supabase.from('opportunities').select('*').order('created_at', { ascending: false }),
          supabase.from('daily_logs').select('*').order('log_date', { ascending: false }),
        ])

        if (oppRes.data) setOpportunities(oppRes.data as unknown as Opportunity[])
        if (logRes.data) setDailyLogs(logRes.data as unknown as DailyLog[])
      } catch (err) {
        console.error('[useLocalData] Failed to load from Supabase:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [user])

  // Enrich opportunities with domain info
  const enrichedOpportunities = opportunities.map(opp => ({
    ...opp,
    domain: domains.find(d => d.id === opp.domain_id),
  }))

  // ---- Opportunity CRUD (Supabase) ----
  const addOpportunity = useCallback((data: Omit<Opportunity, 'id' | 'user_id' | 'created_at' | 'domain'>) => {
    const tempId = crypto.randomUUID()
    const newOpp: Opportunity = {
      ...data,
      id: tempId,
      user_id: userId,
      created_at: new Date().toISOString(),
    }
    setOpportunities(prev => [newOpp, ...prev])

    // Persist to Supabase
    supabase.from('opportunities').insert({
      id: tempId,
      user_id: userId,
      domain_id: data.domain_id ?? null,
      title: data.title,
      description: data.description ?? null,
      type: data.type,
      status: data.status,
      priority: data.priority,
      strategic_value: data.strategic_value ?? null,
      due_date: data.due_date ?? null,
      reminder_at: data.reminder_at ?? null,
      goal_id: data.goal_id ?? null,
      xp_reward: data.xp_reward ?? null,
    }).then(({ error }) => {
      if (error) console.error('[addOpportunity] Supabase insert failed:', error)
    })

    return newOpp
  }, [userId])

  const updateOpportunity = useCallback((id: string, data: Partial<Opportunity>) => {
    setOpportunities(prev => prev.map(opp => opp.id === id ? { ...opp, ...data } : opp))

    // Strip client-only fields before sending to Supabase
    const { domain, ...dbData } = data as any
    supabase.from('opportunities').update(dbData).eq('id', id).then(({ error }) => {
      if (error) console.error('[updateOpportunity] Supabase update failed:', error)
    })
  }, [])

  const deleteOpportunity = useCallback((id: string) => {
    setOpportunities(prev => prev.filter(opp => opp.id !== id))
    supabase.from('opportunities').delete().eq('id', id).then(({ error }) => {
      if (error) console.error('[deleteOpportunity] Supabase delete failed:', error)
    })
  }, [])

  const moveOpportunityStatus = useCallback((id: string, status: Opportunity['status']) => {
    setOpportunities(prev => prev.map(opp => opp.id === id ? { ...opp, status } : opp))
    supabase.from('opportunities').update({ status }).eq('id', id).then(({ error }) => {
      if (error) console.error('[moveOpportunityStatus] Supabase update failed:', error)
    })
  }, [])

  // ---- Daily Log CRUD (Supabase) ----
  const addDailyLog = useCallback((data: Omit<DailyLog, 'id' | 'user_id' | 'created_at'>) => {
    const tempId = crypto.randomUUID()
    const newLog: DailyLog = {
      ...data,
      id: tempId,
      user_id: userId,
      created_at: new Date().toISOString(),
    }
    setDailyLogs(prev => [newLog, ...prev])

    supabase.from('daily_logs').insert({
      id: tempId,
      user_id: userId,
      content: data.content,
      mood: data.mood ?? null,
      energy_level: data.energy_level ?? 5,
      log_date: data.log_date,
    }).then(({ error }) => {
      if (error) console.error('[addDailyLog] Supabase insert failed:', error)
    })

    return newLog
  }, [userId])

  const deleteDailyLog = useCallback((id: string) => {
    setDailyLogs(prev => prev.filter(log => log.id !== id))
    supabase.from('daily_logs').delete().eq('id', id).then(({ error }) => {
      if (error) console.error('[deleteDailyLog] Supabase delete failed:', error)
    })
  }, [])

  // ---- Domain CRUD (localStorage) ----
  const addDomain = useCallback((name: string, color: string, targetPercentage?: number) => {
    const newDomain: LifeDomain = {
      id: `domain-${Date.now()}`,
      user_id: userId,
      name,
      color_theme: color,
      target_percentage: targetPercentage,
      created_at: new Date().toISOString(),
    }
    setDomains(prev => [...prev, newDomain])
    return newDomain
  }, [userId])

  // ---- Habit CRUD (localStorage) ----
  const addHabit = useCallback((data: Omit<Habit, 'id' | 'user_id' | 'created_at' | 'completions'>) => {
    const newHabit: Habit = {
      ...data,
      id: `habit-${Date.now()}`,
      user_id: userId,
      created_at: new Date().toISOString(),
      completions: [],
    }
    setHabits(prev => [...prev, newHabit])
    return newHabit
  }, [userId])

  const toggleHabitCompletion = useCallback((habitId: string, date: string) => {
    setHabits(prev => prev.map(habit => {
      if (habit.id !== habitId) return habit
      const hasCompletion = habit.completions.includes(date)
      return {
        ...habit,
        completions: hasCompletion
          ? habit.completions.filter(d => d !== date)
          : [...habit.completions, date],
      }
    }))
  }, [])

  const deleteHabit = useCallback((id: string) => {
    setHabits(prev => prev.filter(h => h.id !== id))
  }, [])

  // ---- Goal / OKR CRUD (localStorage) ----
  const addGoal = useCallback((data: Omit<Goal, 'id' | 'user_id' | 'created_at'>) => {
    const newGoal: Goal = {
      ...{
        key_results: [],
        cycle: 'custom' as OKRCycle,
        status: 'active' as const,
        start_date: new Date().toISOString().split('T')[0],
      },
      ...data,
      id: `goal-${Date.now()}`,
      user_id: userId,
      created_at: new Date().toISOString(),
    }
    setGoals(prev => [...prev, newGoal])
    return newGoal
  }, [userId])

  const updateGoal = useCallback((id: string, data: Partial<Goal>) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, ...data } : g))
  }, [])

  const toggleMilestone = useCallback((goalId: string, milestoneId: string) => {
    setGoals(prev => prev.map(g => {
      if (g.id !== goalId) return g
      const milestones = g.milestones.map(m =>
        m.id === milestoneId ? { ...m, done: !m.done } : m
      )
      const doneMilestones = milestones.filter(m => m.done).length
      const progress = milestones.length > 0
        ? Math.round((doneMilestones / milestones.length) * 100)
        : g.progress
      return { ...g, milestones, progress }
    }))
  }, [])

  const addKeyResult = useCallback((goalId: string, kr: Omit<KeyResult, 'id' | 'linked_opportunity_ids'>) => {
    setGoals(prev => prev.map(g => {
      if (g.id !== goalId) return g
      const newKR: KeyResult = { ...kr, id: `kr-${Date.now()}`, linked_opportunity_ids: [] }
      return { ...g, key_results: [...g.key_results, newKR] }
    }))
  }, [])

  const updateKeyResult = useCallback((goalId: string, krId: string, data: Partial<KeyResult>) => {
    setGoals(prev => prev.map(g => {
      if (g.id !== goalId) return g
      const key_results = g.key_results.map(kr => kr.id === krId ? { ...kr, ...data } : kr)
      return { ...g, key_results }
    }))
  }, [])

  const deleteKeyResult = useCallback((goalId: string, krId: string) => {
    setGoals(prev => prev.map(g => {
      if (g.id !== goalId) return g
      return { ...g, key_results: g.key_results.filter(kr => kr.id !== krId) }
    }))
  }, [])

  const linkOpportunityToKeyResult = useCallback((goalId: string, krId: string, opportunityId: string) => {
    setGoals(prev => prev.map(g => {
      if (g.id !== goalId) return g
      const key_results = g.key_results.map(kr => {
        if (kr.id !== krId || kr.linked_opportunity_ids.includes(opportunityId)) return kr
        return { ...kr, linked_opportunity_ids: [...kr.linked_opportunity_ids, opportunityId] }
      })
      return { ...g, key_results }
    }))
    updateOpportunity(opportunityId, { goal_id: goalId })
  }, [updateOpportunity])

  const unlinkOpportunityFromKeyResult = useCallback((goalId: string, krId: string, opportunityId: string) => {
    setGoals(prev => prev.map(g => {
      if (g.id !== goalId) return g
      const key_results = g.key_results.map(kr => {
        if (kr.id !== krId) return kr
        return { ...kr, linked_opportunity_ids: kr.linked_opportunity_ids.filter(id => id !== opportunityId) }
      })
      return { ...g, key_results }
    }))
  }, [])

  const completeGoal = useCallback((goalId: string) => {
    setGoals(prev => prev.map(g => {
      if (g.id !== goalId) return g
      const progress = calculateGoalProgress(g, opportunities)
      return { ...g, status: 'completed', progress: 100, final_score: progress }
    }))
  }, [opportunities])

  const cancelGoal = useCallback((goalId: string) => {
    setGoals(prev => prev.map(g => {
      if (g.id !== goalId) return g
      const progress = calculateGoalProgress(g, opportunities)
      return { ...g, status: 'cancelled', final_score: progress, progress }
    }))
  }, [opportunities])

  const deleteGoal = useCallback((id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id))
  }, [])

  // ---- Weekly Targets CRUD ----
  const setWeeklyTarget = useCallback((domainId: string, opportunitiesTarget: number, hoursTarget: number) => {
    setWeeklyTargets(prev => {
      const existing = prev.findIndex(t => t.domain_id === domainId)
      const newTarget: WeeklyTarget = { domain_id: domainId, opportunities_target: opportunitiesTarget, hours_target: hoursTarget }
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = newTarget
        return updated
      }
      return [...prev, newTarget]
    })
  }, [])

  const removeWeeklyTarget = useCallback((domainId: string) => {
    setWeeklyTargets(prev => prev.filter(t => t.domain_id !== domainId))
  }, [])

  // ---- Export / Import ----
  const exportData = useCallback(() => {
    const data = {
      version: 2,
      exportDate: new Date().toISOString(),
      domains,
      opportunities,
      dailyLogs,
      habits,
      goals,
      weeklyTargets,
      xpState: localStorage.getItem('minimal_idea_spark_xp_state'),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const dateStr = new Date().toISOString()?.split('T')[0] ?? new Date().toDateString()
    a.download = `lifeos-backup-${dateStr}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [domains, opportunities, dailyLogs, habits, goals])

  const importData = useCallback((jsonString: string) => {
    try {
      const data = JSON.parse(jsonString)
      if (data.domains) setDomains(data.domains)
      if (data.opportunities) setOpportunities(data.opportunities)
      if (data.dailyLogs) setDailyLogs(data.dailyLogs)
      if (data.habits) setHabits(data.habits)
      if (data.goals) setGoals(data.goals)
      if (data.weeklyTargets) setWeeklyTargets(data.weeklyTargets)
      if (data.xpState) localStorage.setItem('minimal_idea_spark_xp_state', data.xpState)
      return true
    } catch {
      return false
    }
  }, [])

  return {
    domains,
    opportunities: enrichedOpportunities,
    dailyLogs,
    habits,
    goals,
    isLoading,

    addOpportunity,
    updateOpportunity,
    deleteOpportunity,
    moveOpportunityStatus,

    addDailyLog,
    deleteDailyLog,

    addDomain,

    addHabit,
    toggleHabitCompletion,
    deleteHabit,

    addGoal,
    updateGoal,
    toggleMilestone,
    deleteGoal,
    addKeyResult,
    updateKeyResult,
    deleteKeyResult,
    linkOpportunityToKeyResult,
    unlinkOpportunityFromKeyResult,
    completeGoal,
    cancelGoal,

    weeklyTargets,
    setWeeklyTarget,
    removeWeeklyTarget,

    exportData,
    importData,
  }
}
