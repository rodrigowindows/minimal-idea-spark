import { useState, useCallback, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import type {
  Priority,
  PriorityLevel,
  PriorityCategory,
  PriorityStatus,
  KeyResult,
  PriorityInsight,
} from '@/lib/rag/priority-context'
import {
  sortPriorities,
  generatePriorityInsights,
  buildPriorityContextString,
} from '@/lib/rag/priority-context'
import { generateLocalSuggestions } from '@/lib/rag/goal-embeddings'
import type { Goal } from '@/hooks/useLocalData'

const STORAGE_KEY = 'lifeos_priorities'

function loadPriorities(): Priority[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  return []
}

function savePriorities(data: Priority[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function usePriorities(
  opportunities: Array<{ title: string; status: string; type: string; strategic_value: number | null }> = [],
  goals: Goal[] = [],
) {
  const { user } = useAuth()
  const userId = user?.id ?? 'mock-user-001'

  const [priorities, setPriorities] = useState<Priority[]>(() => loadPriorities())

  // Persist on change
  useEffect(() => {
    savePriorities(priorities)
  }, [priorities])

  const activePriorities = useMemo(
    () => sortPriorities(priorities.filter(p => p.status === 'active')),
    [priorities],
  )

  const completedPriorities = useMemo(
    () => priorities.filter(p => p.status === 'completed'),
    [priorities],
  )

  const archivedPriorities = useMemo(
    () => priorities.filter(p => p.status === 'archived'),
    [priorities],
  )

  // Insights
  const insights = useMemo(
    () => generatePriorityInsights(priorities, opportunities, goals),
    [priorities, opportunities, goals],
  )

  // AI suggestions (local)
  const suggestions = useMemo(
    () => generateLocalSuggestions(priorities, goals, opportunities),
    [priorities, goals, opportunities],
  )

  // Priority context string for RAG
  const priorityContext = useMemo(
    () => buildPriorityContextString(priorities),
    [priorities],
  )

  // Stats
  const stats = useMemo(() => {
    const active = activePriorities
    const total = priorities.length
    const avgProgress = active.length > 0
      ? Math.round(active.reduce((sum, p) => sum + p.progress, 0) / active.length)
      : 0
    const criticalCount = active.filter(p => p.priority_level === 'critical').length
    const highCount = active.filter(p => p.priority_level === 'high').length
    const totalKeyResults = active.reduce((sum, p) => sum + p.key_results.length, 0)
    const completedKeyResults = active.reduce(
      (sum, p) => sum + p.key_results.filter(kr => kr.done).length, 0,
    )

    return {
      total,
      active: active.length,
      completed: completedPriorities.length,
      avgProgress,
      criticalCount,
      highCount,
      totalKeyResults,
      completedKeyResults,
    }
  }, [priorities, activePriorities, completedPriorities])

  // --- CRUD ---

  const addPriority = useCallback((data: {
    title: string
    description: string
    priority_level: PriorityLevel
    category: PriorityCategory
    due_date?: string
    key_results?: Omit<KeyResult, 'id'>[]
  }) => {
    const now = new Date().toISOString()
    const newPriority: Priority = {
      id: `priority-${Date.now()}`,
      user_id: userId,
      title: data.title,
      description: data.description,
      priority_level: data.priority_level,
      category: data.category,
      due_date: data.due_date,
      status: 'active',
      progress: 0,
      key_results: (data.key_results || []).map((kr, i) => ({
        ...kr,
        id: `kr-${Date.now()}-${i}`,
      })),
      ai_suggestions: [],
      created_at: now,
      updated_at: now,
    }
    setPriorities(prev => [newPriority, ...prev])
    return newPriority
  }, [userId])

  const updatePriority = useCallback((id: string, data: Partial<Priority>) => {
    setPriorities(prev => prev.map(p =>
      p.id === id ? { ...p, ...data, updated_at: new Date().toISOString() } : p
    ))
  }, [])

  const deletePriority = useCallback((id: string) => {
    setPriorities(prev => prev.filter(p => p.id !== id))
  }, [])

  const changePriorityStatus = useCallback((id: string, status: PriorityStatus) => {
    setPriorities(prev => prev.map(p =>
      p.id === id ? { ...p, status, updated_at: new Date().toISOString() } : p
    ))
  }, [])

  const updateKeyResult = useCallback((priorityId: string, krId: string, data: Partial<KeyResult>) => {
    setPriorities(prev => prev.map(p => {
      if (p.id !== priorityId) return p

      const keyResults = p.key_results.map(kr =>
        kr.id === krId ? { ...kr, ...data, done: data.current !== undefined ? data.current >= kr.target : (data.done ?? kr.done) } : kr
      )

      // Recalculate progress from key results
      const totalKRs = keyResults.length
      const completedKRs = keyResults.filter(kr => kr.done).length
      const progress = totalKRs > 0 ? Math.round((completedKRs / totalKRs) * 100) : p.progress

      return { ...p, key_results: keyResults, progress, updated_at: new Date().toISOString() }
    }))
  }, [])

  const addKeyResult = useCallback((priorityId: string, kr: Omit<KeyResult, 'id'>) => {
    setPriorities(prev => prev.map(p => {
      if (p.id !== priorityId) return p
      return {
        ...p,
        key_results: [...p.key_results, { ...kr, id: `kr-${Date.now()}` }],
        updated_at: new Date().toISOString(),
      }
    }))
  }, [])

  const removeKeyResult = useCallback((priorityId: string, krId: string) => {
    setPriorities(prev => prev.map(p => {
      if (p.id !== priorityId) return p
      const keyResults = p.key_results.filter(kr => kr.id !== krId)
      const totalKRs = keyResults.length
      const completedKRs = keyResults.filter(kr => kr.done).length
      const progress = totalKRs > 0 ? Math.round((completedKRs / totalKRs) * 100) : 0
      return { ...p, key_results: keyResults, progress, updated_at: new Date().toISOString() }
    }))
  }, [])

  return {
    // Data
    priorities,
    activePriorities,
    completedPriorities,
    archivedPriorities,
    insights,
    suggestions,
    priorityContext,
    stats,

    // Actions
    addPriority,
    updatePriority,
    deletePriority,
    changePriorityStatus,
    updateKeyResult,
    addKeyResult,
    removeKeyResult,
  }
}
