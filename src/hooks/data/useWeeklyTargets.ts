import { useState, useCallback, useEffect } from 'react'
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from './storage'
import type { WeeklyTarget } from './types'

export function useWeeklyTargets() {
  const [weeklyTargets, setWeeklyTargets] = useState<WeeklyTarget[]>(() =>
    loadFromStorage(STORAGE_KEYS.weeklyTargets, [])
  )

  useEffect(() => { saveToStorage(STORAGE_KEYS.weeklyTargets, weeklyTargets) }, [weeklyTargets])

  const setWeeklyTarget = useCallback((domainId: string, opportunitiesTarget: number, hoursTarget: number) => {
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
  }, [])

  const removeWeeklyTarget = useCallback((domainId: string) => {
    setWeeklyTargets(prev => prev.filter(t => t.domain_id !== domainId))
  }, [])

  return { weeklyTargets, setWeeklyTarget, removeWeeklyTarget }
}
