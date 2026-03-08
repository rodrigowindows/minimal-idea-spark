import { useState, useCallback, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import type { Habit } from './types'

/**
 * Habits — synced with Supabase `habits` table.
 * Completions are stored client-side (localStorage) until a completions table is created.
 */
const COMPLETIONS_KEY = 'lifeos_habit_completions'

function loadCompletions(): Record<string, string[]> {
  try {
    const stored = localStorage.getItem(COMPLETIONS_KEY)
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  return {}
}

function saveCompletions(data: Record<string, string[]>) {
  localStorage.setItem(COMPLETIONS_KEY, JSON.stringify(data))
}

export function useHabits() {
  const { user } = useAuth()
  const userId = user?.id ?? 'local'
  const initialLoadDone = useRef(false)

  const [habits, setHabits] = useState<Habit[]>([])
  const [completions, setCompletions] = useState<Record<string, string[]>>(loadCompletions)
  const [isLoading, setIsLoading] = useState(true)

  // Persist completions to localStorage
  useEffect(() => { saveCompletions(completions) }, [completions])

  // Fetch from Supabase
  useEffect(() => {
    if (!user || initialLoadDone.current) return
    initialLoadDone.current = true

    supabase
      .from('habits')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) {
          setHabits(data.map(h => ({
            id: h.id,
            user_id: h.user_id,
            name: h.title,
            domain_id: null,
            frequency: h.frequency as 'daily' | 'weekly',
            target_count: h.target_count,
            color: '#8b5cf6',
            created_at: h.created_at,
            completions: completions[h.id] ?? [],
          })))
        }
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }, [user])

  // Merge completions into habits when completions change
  const habitsWithCompletions = habits.map(h => ({
    ...h,
    completions: completions[h.id] ?? [],
  }))

  const addHabit = useCallback((data: Omit<Habit, 'id' | 'user_id' | 'created_at' | 'completions'>) => {
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
    setCompletions(prev => {
      const current = prev[habitId] ?? []
      const has = current.includes(date)
      return {
        ...prev,
        [habitId]: has ? current.filter(d => d !== date) : [...current, date],
      }
    })
  }, [])

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
