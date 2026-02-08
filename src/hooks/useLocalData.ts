import { useState, useCallback, useEffect } from 'react'
import type { DailyLog, LifeDomain, Opportunity } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import type { Automation } from '@/lib/automation/engine'
import type { Trigger } from '@/lib/automation/triggers'
import type { Action } from '@/lib/automation/actions'

const STORAGE_KEYS = {
  domains: 'lifeos_domains',
  opportunities: 'lifeos_opportunities',
  dailyLogs: 'lifeos_daily_logs',
  habits: 'lifeos_habits',
  goals: 'lifeos_goals',
  weeklyTargets: 'lifeos_weekly_targets',
  automations: 'lifeos_automations',
} as const

const defaultDomains: LifeDomain[] = [
  { id: 'domain-career', user_id: 'mock-user-001', name: 'Career', color_theme: '#4f46e5', target_percentage: 30, created_at: '2025-01-01T00:00:00Z' },
  { id: 'domain-health', user_id: 'mock-user-001', name: 'Health', color_theme: '#10b981', target_percentage: 25, created_at: '2025-01-01T00:00:00Z' },
  { id: 'domain-finance', user_id: 'mock-user-001', name: 'Finance', color_theme: '#f59e0b', target_percentage: 20, created_at: '2025-01-01T00:00:00Z' },
  { id: 'domain-learning', user_id: 'mock-user-001', name: 'Learning', color_theme: '#8b5cf6', target_percentage: 25, created_at: '2025-01-01T00:00:00Z' },
  { id: 'domain-family', user_id: 'mock-user-001', name: 'Family', color_theme: '#ec4899', target_percentage: 0, created_at: '2025-01-01T00:00:00Z' },
]

const defaultOpportunities: Opportunity[] = [
  { id: 'opp-001', user_id: 'mock-user-001', domain_id: 'domain-career', title: 'Prepare portfolio presentation', description: 'Create a compelling portfolio deck for upcoming client meetings', type: 'action', status: 'doing', priority: 9, strategic_value: 8, created_at: '2025-06-01T10:00:00Z', domain: defaultDomains[0] },
  { id: 'opp-002', user_id: 'mock-user-001', domain_id: 'domain-learning', title: 'Study for SEFAZ exam', description: 'Deep dive into tax law and public finance modules', type: 'study', status: 'doing', priority: 10, strategic_value: 10, created_at: '2025-06-02T09:00:00Z', domain: defaultDomains[3] },
  { id: 'opp-003', user_id: 'mock-user-001', domain_id: 'domain-health', title: 'Establish morning workout routine', description: 'Build a consistent 30-minute morning exercise habit', type: 'action', status: 'doing', priority: 8, strategic_value: 9, created_at: '2025-06-01T07:00:00Z', domain: defaultDomains[1] },
  { id: 'opp-004', user_id: 'mock-user-001', domain_id: 'domain-health', title: 'Study sleep optimization techniques', description: 'Research evidence-based methods to improve sleep quality', type: 'study', status: 'review', priority: 7, strategic_value: 7, created_at: '2025-06-03T14:00:00Z', domain: defaultDomains[1] },
  { id: 'opp-005', user_id: 'mock-user-001', domain_id: 'domain-finance', title: 'Review investment allocation', description: 'Rebalance portfolio based on current market conditions', type: 'action', status: 'backlog', priority: 7, strategic_value: 8, created_at: '2025-06-04T11:00:00Z', domain: defaultDomains[2] },
  { id: 'opp-006', user_id: 'mock-user-001', domain_id: 'domain-finance', title: 'Insight: Compound growth realization', description: 'Key insight about long-term compounding effects on savings rate', type: 'insight', status: 'done', priority: 5, strategic_value: 6, created_at: '2025-05-28T16:00:00Z', domain: defaultDomains[2] },
  { id: 'opp-007', user_id: 'mock-user-001', domain_id: 'domain-learning', title: 'Complete TypeScript advanced patterns course', description: 'Finish the advanced generics and type manipulation modules', type: 'study', status: 'doing', priority: 8, strategic_value: 7, created_at: '2025-06-01T08:00:00Z', domain: defaultDomains[3] },
  { id: 'opp-008', user_id: 'mock-user-001', domain_id: 'domain-learning', title: 'Connect with study group members', description: 'Reach out to peers in the online learning community', type: 'networking', status: 'backlog', priority: 4, strategic_value: 3, created_at: '2025-06-05T13:00:00Z', domain: defaultDomains[3] },
  { id: 'opp-009', user_id: 'mock-user-001', domain_id: 'domain-career', title: 'Attend networking event downtown', description: 'Meet potential collaborators at the tech meetup', type: 'networking', status: 'backlog', priority: 5, strategic_value: 5, created_at: '2025-06-06T18:00:00Z', domain: defaultDomains[0] },
  { id: 'opp-010', user_id: 'mock-user-001', domain_id: 'domain-health', title: 'Meal prep for the week', description: 'Plan and prepare healthy meals for the upcoming week', type: 'action', status: 'done', priority: 6, strategic_value: 7, created_at: '2025-05-30T09:00:00Z', domain: defaultDomains[1] },
  { id: 'opp-011', user_id: 'mock-user-001', domain_id: 'domain-learning', title: 'Learn Golang basics', description: 'Explore Go for potential blockchain projects', type: 'study', status: 'backlog', priority: 3, strategic_value: 2, created_at: '2025-06-07T10:00:00Z', domain: defaultDomains[3] },
]

const defaultDailyLogs: DailyLog[] = [
  { id: 'log-001', user_id: 'mock-user-001', content: 'Productive day. Finished the portfolio draft and had a solid workout session.', mood: 'great', energy_level: 9, log_date: '2025-06-06', created_at: '2025-06-06T22:00:00Z' },
  { id: 'log-002', user_id: 'mock-user-001', content: 'Struggled with focus in the afternoon. Morning routine went well but energy dipped after lunch.', mood: 'okay', energy_level: 5, log_date: '2025-06-05', created_at: '2025-06-05T21:30:00Z' },
  { id: 'log-003', user_id: 'mock-user-001', content: 'Great progress on the TypeScript course. Had an interesting insight about generics.', mood: 'good', energy_level: 7, log_date: '2025-06-04', created_at: '2025-06-04T20:45:00Z' },
  { id: 'log-004', user_id: 'mock-user-001', content: 'Rough start to the day. Overslept and missed morning routine. Caught up on reading in the evening.', mood: 'bad', energy_level: 3, log_date: '2025-06-03', created_at: '2025-06-03T23:00:00Z' },
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

export interface Habit {
  id: string
  user_id: string
  name: string
  domain_id: string | null
  frequency: 'daily' | 'weekly'
  target_count: number
  color: string
  created_at: string
  completions: string[] // dates of completions (ISO date strings)
}

export interface Goal {
  id: string
  user_id: string
  title: string
  description: string
  domain_id: string | null
  target_date: string
  progress: number // 0-100
  milestones: { id: string; title: string; done: boolean }[]
  created_at: string
}

export interface WeeklyTarget {
  domain_id: string
  opportunities_target: number // how many opportunities to complete per week
  hours_target: number // hours of deep work per week for this domain
}

export function useLocalData() {
  const { user } = useAuth()
  const userId = user?.id ?? 'mock-user-001'

  const [domains, setDomains] = useState<LifeDomain[]>(() =>
    loadFromStorage(STORAGE_KEYS.domains, defaultDomains)
  )
  const [opportunities, setOpportunities] = useState<Opportunity[]>(() =>
    loadFromStorage(STORAGE_KEYS.opportunities, defaultOpportunities)
  )
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>(() =>
    loadFromStorage(STORAGE_KEYS.dailyLogs, defaultDailyLogs)
  )
  const [habits, setHabits] = useState<Habit[]>(() =>
    loadFromStorage(STORAGE_KEYS.habits, [])
  )
  const [goals, setGoals] = useState<Goal[]>(() =>
    loadFromStorage(STORAGE_KEYS.goals, [])
  )
  const [weeklyTargets, setWeeklyTargets] = useState<WeeklyTarget[]>(() =>
    loadFromStorage(STORAGE_KEYS.weeklyTargets, [])
  )
  const [automations, setAutomations] = useState<Automation[]>(() =>
    loadFromStorage(STORAGE_KEYS.automations, [])
  )

  // Persist on change
  useEffect(() => { saveToStorage(STORAGE_KEYS.domains, domains) }, [domains])
  useEffect(() => { saveToStorage(STORAGE_KEYS.opportunities, opportunities) }, [opportunities])
  useEffect(() => { saveToStorage(STORAGE_KEYS.dailyLogs, dailyLogs) }, [dailyLogs])
  useEffect(() => { saveToStorage(STORAGE_KEYS.habits, habits) }, [habits])
  useEffect(() => { saveToStorage(STORAGE_KEYS.goals, goals) }, [goals])
  useEffect(() => { saveToStorage(STORAGE_KEYS.weeklyTargets, weeklyTargets) }, [weeklyTargets])
  useEffect(() => { saveToStorage(STORAGE_KEYS.automations, automations) }, [automations])

  // Enrich opportunities with domain
  const enrichedOpportunities = opportunities.map(opp => ({
    ...opp,
    domain: domains.find(d => d.id === opp.domain_id),
  }))

  // ---- Opportunity CRUD ----
  const addOpportunity = useCallback((data: Omit<Opportunity, 'id' | 'user_id' | 'created_at' | 'domain'>) => {
    const newOpp: Opportunity = {
      ...data,
      id: `opp-${Date.now()}`,
      user_id: userId,
      created_at: new Date().toISOString(),
    }
    setOpportunities(prev => [newOpp, ...prev])
    return newOpp
  }, [userId])

  const updateOpportunity = useCallback((id: string, data: Partial<Opportunity>) => {
    setOpportunities(prev => prev.map(opp =>
      opp.id === id ? { ...opp, ...data } : opp
    ))
  }, [])

  const deleteOpportunity = useCallback((id: string) => {
    setOpportunities(prev => prev.filter(opp => opp.id !== id))
  }, [])

  const moveOpportunityStatus = useCallback((id: string, status: Opportunity['status']) => {
    setOpportunities(prev => prev.map(opp =>
      opp.id === id ? { ...opp, status } : opp
    ))
  }, [])

  // ---- Daily Log CRUD ----
  const addDailyLog = useCallback((data: Omit<DailyLog, 'id' | 'user_id' | 'created_at'>) => {
    const newLog: DailyLog = {
      ...data,
      id: `log-${Date.now()}`,
      user_id: userId,
      created_at: new Date().toISOString(),
    }
    setDailyLogs(prev => [newLog, ...prev])
    return newLog
  }, [userId])

  const deleteDailyLog = useCallback((id: string) => {
    setDailyLogs(prev => prev.filter(log => log.id !== id))
  }, [])

  // ---- Domain CRUD ----
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

  // ---- Habit CRUD ----
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

  // ---- Goal CRUD ----
  const addGoal = useCallback((data: Omit<Goal, 'id' | 'user_id' | 'created_at'>) => {
    const newGoal: Goal = {
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

  // ---- Automation CRUD ----
  const addAutomation = useCallback((data: { name: string; description: string; enabled: boolean; trigger: Trigger; actions: Action[] }) => {
    const newAuto: Automation = {
      ...data,
      id: `auto-${Date.now()}`,
      createdAt: new Date().toISOString(),
      runCount: 0,
    }
    setAutomations(prev => [newAuto, ...prev])
    return newAuto
  }, [])

  const updateAutomation = useCallback((id: string, data: Partial<Automation>) => {
    setAutomations(prev => prev.map(a => a.id === id ? { ...a, ...data } : a))
  }, [])

  const deleteAutomation = useCallback((id: string) => {
    setAutomations(prev => prev.filter(a => a.id !== id))
  }, [])

  const toggleAutomation = useCallback((id: string) => {
    setAutomations(prev => prev.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a))
  }, [])

  // ---- Export / Import ----
  const exportData = useCallback(() => {
    const data = {
      version: 1,
      exportDate: new Date().toISOString(),
      domains,
      opportunities,
      dailyLogs,
      habits,
      goals,
      weeklyTargets,
      automations,
      xpState: localStorage.getItem('minimal_idea_spark_xp_state'),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lifeos-backup-${new Date().toISOString().split('T')[0]}.json`
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
      if (data.automations) setAutomations(data.automations)
      if (data.xpState) localStorage.setItem('minimal_idea_spark_xp_state', data.xpState)
      return true
    } catch {
      return false
    }
  }, [])

  return {
    // Data
    domains,
    opportunities: enrichedOpportunities,
    dailyLogs,
    habits,
    goals,
    isLoading: false,

    // Opportunity actions
    addOpportunity,
    updateOpportunity,
    deleteOpportunity,
    moveOpportunityStatus,

    // Daily log actions
    addDailyLog,
    deleteDailyLog,

    // Domain actions
    addDomain,

    // Habit actions
    addHabit,
    toggleHabitCompletion,
    deleteHabit,

    // Goal actions
    addGoal,
    updateGoal,
    toggleMilestone,
    deleteGoal,

    // Weekly target actions
    weeklyTargets,
    setWeeklyTarget,
    removeWeeklyTarget,

    // Automation actions
    automations,
    addAutomation,
    updateAutomation,
    deleteAutomation,
    toggleAutomation,

    // Export/Import
    exportData,
    importData,
  }
}
