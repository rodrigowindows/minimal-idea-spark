/**
 * useLocalData — thin facade over focused data hooks.
 * Keeps backward compatibility for all existing consumers.
 */
import { useCallback } from 'react'
import {
  useDomains,
  useOpportunities,
  useDailyLogs,
  useHabits,
  useGoals,
  useWeeklyTargets,
} from '@/hooks/data'

// Re-export types for backward compat
export type { Goal, Habit, KeyResult, OKRCycle, PriorityLevel, WeeklyTarget } from '@/hooks/data'

export function useLocalData() {
  const { domains, addDomain } = useDomains()
  const {
    opportunities, isLoading: oppLoading,
    addOpportunity, updateOpportunity, deleteOpportunity, moveOpportunityStatus,
  } = useOpportunities(domains)
  const { dailyLogs, isLoading: logsLoading, addDailyLog, updateDailyLog, deleteDailyLog } = useDailyLogs()
  const { habits, addHabit, toggleHabitCompletion, deleteHabit } = useHabits()
  const {
    goals, addGoal, updateGoal, toggleMilestone, deleteGoal,
    addKeyResult, updateKeyResult, deleteKeyResult,
    linkOpportunityToKeyResult, unlinkOpportunityFromKeyResult,
    completeGoal, cancelGoal,
  } = useGoals(opportunities)
  const { weeklyTargets, setWeeklyTarget, removeWeeklyTarget } = useWeeklyTargets()

  const isLoading = oppLoading || logsLoading

  // Link opportunity to key result (also updates the opportunity's goal_id)
  const linkOpportunityToKeyResultAndUpdate = useCallback(
    (goalId: string, krId: string, opportunityId: string) => {
      linkOpportunityToKeyResult(goalId, krId, opportunityId)
      updateOpportunity(opportunityId, { goal_id: goalId })
    },
    [linkOpportunityToKeyResult, updateOpportunity],
  )

  const exportData = useCallback(() => {
    const data = {
      version: 4,
      exportDate: new Date().toISOString(),
      domains, opportunities, dailyLogs, habits, goals, weeklyTargets,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lifeos-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [domains, opportunities, dailyLogs, habits, goals, weeklyTargets])

  const importData = useCallback((_jsonString: string) => {
    // Import is complex with Supabase sync — placeholder for now
    console.warn('[importData] Not yet implemented for Supabase-backed data')
    return false
  }, [])

  return {
    domains, opportunities, dailyLogs, habits, goals, isLoading,
    addOpportunity, updateOpportunity, deleteOpportunity, moveOpportunityStatus,
    addDailyLog, updateDailyLog, deleteDailyLog,
    addDomain,
    addHabit, toggleHabitCompletion, deleteHabit,
    addGoal, updateGoal, toggleMilestone, deleteGoal,
    addKeyResult, updateKeyResult, deleteKeyResult,
    linkOpportunityToKeyResult: linkOpportunityToKeyResultAndUpdate,
    unlinkOpportunityFromKeyResult,
    completeGoal, cancelGoal,
    weeklyTargets, setWeeklyTarget, removeWeeklyTarget,
    exportData, importData,
  }
}
