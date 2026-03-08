import { useState, useCallback, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from './storage'
import type { WeeklyTarget } from './types'

/**
 * WeeklyTargets — synced with Supabase `weekly_targets` table.
 * Migrates from localStorage on first Supabase load.
 */
export function useWeeklyTargets() {
  const { user } = useAuth()
  const userId = user?.id
  const loadedForUser = useRef<string | null>(null)

  const [weeklyTargets, setWeeklyTargets] = useState<WeeklyTarget[]>([])

  useEffect(() => {
    if (!userId) {
      setWeeklyTargets([])
      loadedForUser.current = null
      return
    }
    if (loadedForUser.current === userId) return
    loadedForUser.current = userId

    async function load() {
      try {
        const { data, error } = await (supabase as any)
          .from('weekly_targets')
          .select('*')

        if (!error && data && data.length > 0) {
          setWeeklyTargets(data.map((d: any) => ({
            domain_id: d.domain_id,
            opportunities_target: d.opportunities_target,
            hours_target: Number(d.hours_target),
          })))
          // Clear legacy localStorage
          try { localStorage.removeItem(STORAGE_KEYS.weeklyTargets) } catch {}
        } else if (!error && (!data || data.length === 0)) {
          // Migrate from localStorage if exists
          const stored = loadFromStorage<WeeklyTarget[]>(STORAGE_KEYS.weeklyTargets, [])
          if (stored.length > 0) {
            setWeeklyTargets(stored)
            const rows = stored.map(t => ({
              user_id: userId!,
              domain_id: t.domain_id,
              opportunities_target: t.opportunities_target,
              hours_target: t.hours_target,
            }))
            await (supabase as any).from('weekly_targets').insert(rows)
            try { localStorage.removeItem(STORAGE_KEYS.weeklyTargets) } catch {}
          }
        }
      } catch { /* ignore */ }
    }
    load()
  }, [userId])

  const setWeeklyTarget = useCallback((domainId: string, opportunitiesTarget: number, hoursTarget: number) => {
    if (!userId) return
    setWeeklyTargets(prev => {
      const idx = prev.findIndex(t => t.domain_id === domainId)
      const newTarget: WeeklyTarget = { domain_id: domainId, opportunities_target: opportunitiesTarget, hours_target: hoursTarget }
      if (idx >= 0) {
        const updated = [...prev]
        updated[idx] = newTarget
        return updated
      }
      return [...prev, newTarget]
    })

    // Upsert to Supabase
    ;(supabase as any).from('weekly_targets').upsert({
      user_id: userId,
      domain_id: domainId,
      opportunities_target: opportunitiesTarget,
      hours_target: hoursTarget,
    }, { onConflict: 'user_id,domain_id' }).then(({ error }: any) => {
      if (error) console.error('[setWeeklyTarget]', error)
    })
  }, [userId])

  const removeWeeklyTarget = useCallback((domainId: string) => {
    if (!userId) return
    setWeeklyTargets(prev => prev.filter(t => t.domain_id !== domainId))
    ;(supabase as any).from('weekly_targets').delete()
      .eq('user_id', userId)
      .eq('domain_id', domainId)
      .then(({ error }: any) => {
        if (error) console.error('[removeWeeklyTarget]', error)
      })
  }, [userId])

  return { weeklyTargets, setWeeklyTarget, removeWeeklyTarget }
}
