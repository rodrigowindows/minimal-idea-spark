import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
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

export function usePriorities(
  opportunities: Array<{ title: string; status: string; type: string; strategic_value: number | null }> = [],
  goals: Goal[] = [],
) {
  const { user } = useAuth()
  const userId = user?.id
  const loadedForUser = useRef<string | null>(null)

  const [priorities, setPriorities] = useState<Priority[]>([])

  // Load from Supabase + migrate localStorage
  useEffect(() => {
    if (!userId) {
      setPriorities([])
      loadedForUser.current = null
      return
    }
    if (loadedForUser.current === userId) return
    loadedForUser.current = userId

    async function load() {
      try {
        const { data, error } = await (supabase as any)
          .from('user_priorities')
          .select('*')
          .order('created_at', { ascending: false })

        if (!error && data && data.length > 0) {
          setPriorities(data.map(mapRowToPriority))
          try { localStorage.removeItem(STORAGE_KEY) } catch {}
        } else if (!error && (!data || data.length === 0)) {
          // Migrate from localStorage
          try {
            const stored = localStorage.getItem(STORAGE_KEY)
            if (stored) {
              const local: Priority[] = JSON.parse(stored)
              if (local.length > 0) {
                setPriorities(local)
                const rows = local.map(p => ({
                  user_id: userId!,
                  title: p.title,
                  description: p.description,
                  priority_level: p.priority_level,
                  category: p.category,
                  due_date: p.due_date ?? null,
                  status: p.status,
                  progress: p.progress,
                  key_results: p.key_results,
                  ai_suggestions: p.ai_suggestions,
                }))
                const { data: inserted } = await (supabase as any)
                  .from('user_priorities')
                  .insert(rows)
                  .select()
                if (inserted) setPriorities(inserted.map(mapRowToPriority))
                localStorage.removeItem(STORAGE_KEY)
              }
            }
          } catch { /* ignore */ }
        }
      } catch { /* ignore */ }
    }
    load()
  }, [userId])

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

  const insights = useMemo(
    () => generatePriorityInsights(priorities, opportunities, goals),
    [priorities, opportunities, goals],
  )

  const suggestions = useMemo(
    () => generateLocalSuggestions(priorities, goals, opportunities),
    [priorities, goals, opportunities],
  )

  const priorityContext = useMemo(
    () => buildPriorityContextString(priorities),
    [priorities],
  )

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
    if (!userId) return null as unknown as Priority
    const now = new Date().toISOString()
    const tempId = crypto.randomUUID()
    const newPriority: Priority = {
      id: tempId,
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

    ;(supabase as any).from('user_priorities').insert({
      user_id: userId,
      title: data.title,
      description: data.description,
      priority_level: data.priority_level,
      category: data.category,
      due_date: data.due_date ?? null,
      status: 'active',
      progress: 0,
      key_results: newPriority.key_results,
      ai_suggestions: [],
    }).select().single().then(({ data: row, error }: any) => {
      if (error) {
        console.error('[addPriority]', error)
      } else if (row) {
        setPriorities(prev => prev.map(p => p.id === tempId ? mapRowToPriority(row) : p))
      }
    })

    return newPriority
  }, [userId])

  const updatePriority = useCallback((id: string, data: Partial<Priority>) => {
    setPriorities(prev => prev.map(p =>
      p.id === id ? { ...p, ...data, updated_at: new Date().toISOString() } : p
    ))
    const { id: _id, user_id: _uid, created_at: _ca, updated_at: _ua, ...safe } = data as any
    ;(supabase as any).from('user_priorities').update(safe).eq('id', id).then(({ error }: any) => {
      if (error) console.error('[updatePriority]', error)
    })
  }, [])

  const deletePriority = useCallback((id: string) => {
    setPriorities(prev => prev.filter(p => p.id !== id))
    ;(supabase as any).from('user_priorities').delete().eq('id', id).then(({ error }: any) => {
      if (error) console.error('[deletePriority]', error)
    })
  }, [])

  const changePriorityStatus = useCallback((id: string, status: PriorityStatus) => {
    setPriorities(prev => prev.map(p =>
      p.id === id ? { ...p, status, updated_at: new Date().toISOString() } : p
    ))
    ;(supabase as any).from('user_priorities').update({ status }).eq('id', id).then(({ error }: any) => {
      if (error) console.error('[changePriorityStatus]', error)
    })
  }, [])

  const updateKeyResult = useCallback((priorityId: string, krId: string, data: Partial<KeyResult>) => {
    setPriorities(prev => prev.map(p => {
      if (p.id !== priorityId) return p
      const keyResults = p.key_results.map(kr =>
        kr.id === krId ? { ...kr, ...data, done: data.current !== undefined ? data.current >= kr.target : (data.done ?? kr.done) } : kr
      )
      const totalKRs = keyResults.length
      const completedKRs = keyResults.filter(kr => kr.done).length
      const progress = totalKRs > 0 ? Math.round((completedKRs / totalKRs) * 100) : p.progress
      const updated = { ...p, key_results: keyResults, progress, updated_at: new Date().toISOString() }

      ;(supabase as any).from('user_priorities').update({ key_results: keyResults, progress }).eq('id', priorityId).then(({ error }: any) => {
        if (error) console.error('[updateKeyResult]', error)
      })

      return updated
    }))
  }, [])

  const addKeyResult = useCallback((priorityId: string, kr: Omit<KeyResult, 'id'>) => {
    setPriorities(prev => prev.map(p => {
      if (p.id !== priorityId) return p
      const keyResults = [...p.key_results, { ...kr, id: `kr-${Date.now()}` }]
      const updated = { ...p, key_results: keyResults, updated_at: new Date().toISOString() }

      ;(supabase as any).from('user_priorities').update({ key_results: keyResults }).eq('id', priorityId).then(({ error }: any) => {
        if (error) console.error('[addKeyResult]', error)
      })

      return updated
    }))
  }, [])

  const removeKeyResult = useCallback((priorityId: string, krId: string) => {
    setPriorities(prev => prev.map(p => {
      if (p.id !== priorityId) return p
      const keyResults = p.key_results.filter(kr => kr.id !== krId)
      const totalKRs = keyResults.length
      const completedKRs = keyResults.filter(kr => kr.done).length
      const progress = totalKRs > 0 ? Math.round((completedKRs / totalKRs) * 100) : 0
      const updated = { ...p, key_results: keyResults, progress, updated_at: new Date().toISOString() }

      ;(supabase as any).from('user_priorities').update({ key_results: keyResults, progress }).eq('id', priorityId).then(({ error }: any) => {
        if (error) console.error('[removeKeyResult]', error)
      })

      return updated
    }))
  }, [])

  return {
    priorities,
    activePriorities,
    completedPriorities,
    archivedPriorities,
    insights,
    suggestions,
    priorityContext,
    stats,
    addPriority,
    updatePriority,
    deletePriority,
    changePriorityStatus,
    updateKeyResult,
    addKeyResult,
    removeKeyResult,
  }
}

function mapRowToPriority(row: any): Priority {
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    description: row.description,
    priority_level: row.priority_level,
    category: row.category,
    due_date: row.due_date ?? undefined,
    status: row.status,
    progress: row.progress,
    key_results: Array.isArray(row.key_results) ? row.key_results : [],
    ai_suggestions: Array.isArray(row.ai_suggestions) ? row.ai_suggestions : [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}
