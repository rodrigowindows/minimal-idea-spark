import { useState, useCallback, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import type { Habit } from './types'

/**
 * Habits — synced with Supabase `habits` + `habit_completions` tables.
 */
export function useHabits() {
  const { user } = useAuth()
  const userId = user?.id
  const loadedForUser = useRef<string | null>(null)

  const [habits, setHabits] = useState<Habit[]>([])
  const [completions, setCompletions] = useState<Record<string, string[]>>({})
  const [isLoading, setIsLoading] = useState(true)

  // Fetch habits + completions from Supabase
  useEffect(() => {
    if (!userId) {
      setHabits([])
      setCompletions({})
      setIsLoading(false)
      loadedForUser.current = null
      return
    }
    if (loadedForUser.current === userId) return
    loadedForUser.current = userId

    setIsLoading(true)
    async function load() {
      try {
        const [habitsRes, completionsRes] = await Promise.all([
          supabase.from('habits').select('*').order('created_at', { ascending: false }),
          supabase.from('habit_completions').select('*'),
        ])

        const completionMap: Record<string, string[]> = {}
        if (!completionsRes.error && completionsRes.data) {
          for (const c of completionsRes.data) {
            if (!completionMap[c.habit_id]) completionMap[c.habit_id] = []
            completionMap[c.habit_id].push(c.completed_date)
          }
        }
        setCompletions(completionMap)

        if (!habitsRes.error && habitsRes.data) {
          setHabits(habitsRes.data.map(h => ({
            id: h.id,
            user_id: h.user_id,
            name: h.title,
            domain_id: null,
            frequency: h.frequency as 'daily' | 'weekly',
            target_count: h.target_count,
            color: '#8b5cf6',
            created_at: h.created_at,
            completions: completionMap[h.id] ?? [],
          })))
        }
      } catch { /* ignore */ }
      setIsLoading(false)
    }
    load()
  }, [userId])

  // Merge completions into habits
  const habitsWithCompletions = habits.map(h => ({
    ...h,
    completions: completions[h.id] ?? [],
  }))

  const addHabit = useCallback((data: Omit<Habit, 'id' | 'user_id' | 'created_at' | 'completions'>) => {
    if (!userId) return null as unknown as Habit
    const tempId = crypto.randomUUID()
    const newHabit: Habit = {
      ...data,
      id: tempId,
      user_id: userId,
      created_at: new Date().toISOString(),
      completions: [],
    }
    setHabits(prev => [newHabit, ...prev])

    supabase.from('habits').insert({
      id: tempId,
      user_id: userId,
      title: data.name,
      description: null,
      frequency: data.frequency,
      target_count: data.target_count,
    }).then(({ error }) => { if (error) console.error('[addHabit]', error) })

    return newHabit
  }, [userId])

  const toggleHabitCompletion = useCallback((habitId: string, date: string) => {
    if (!userId) return

    setCompletions(prev => {
      const current = prev[habitId] ?? []
      const has = current.includes(date)
      return {
        ...prev,
        [habitId]: has ? current.filter(d => d !== date) : [...current, date],
      }
    })

    // Sync with Supabase
    const current = completions[habitId] ?? []
    const has = current.includes(date)

    if (has) {
      supabase.from('habit_completions')
        .delete()
        .eq('habit_id', habitId)
        .eq('completed_date', date)
        .then(({ error }) => { if (error) console.error('[toggleHabit:delete]', error) })
    } else {
      supabase.from('habit_completions')
        .insert({ habit_id: habitId, user_id: userId, completed_date: date })
        .then(({ error }) => { if (error) console.error('[toggleHabit:insert]', error) })
    }
  }, [userId, completions])

  const deleteHabit = useCallback((id: string) => {
    setHabits(prev => prev.filter(h => h.id !== id))
    supabase.from('habits').delete().eq('id', id).then(({ error }) => {
      if (error) console.error('[deleteHabit]', error)
    })
  }, [])

  return {
    habits: habitsWithCompletions,
    isLoading,
    addHabit,
    toggleHabitCompletion,
    deleteHabit,
  }
}
