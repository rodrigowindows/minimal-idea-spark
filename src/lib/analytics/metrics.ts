/**
 * Productivity metrics, aggregations, and temporal comparisons for Analytics dashboard.
 */

import { startOfWeek, endOfWeek, subWeeks, isWithinInterval, parseISO, format, subDays, differenceInDays } from 'date-fns'
import type { Opportunity, DailyLog } from '@/types'
import type { Habit, Goal, WeeklyTarget } from '@/hooks/useLocalData'

export interface ProductivityMetric {
  date: string
  tasksCompleted: number
  deepWorkMinutes: number
  xpGained: number
  logsCount: number
}

export interface TimeComparison {
  period: string
  current: number
  previous: number
  changePercent: number
  trend: 'up' | 'down' | 'stable'
}

export interface KpiDefinition {
  id: string
  name: string
  unit: string
  target?: number
  icon?: string
}

export interface CustomKpi extends KpiDefinition {
  currentValue: number
  progress: number // 0-100
}

export interface PeriodStats {
  tasksCompleted: number
  tasksByStatus: Record<string, number>
  tasksByDomain: Record<string, number>
  tasksByType: Record<string, number>
  deepWorkMinutes: number
  xpGained: number
  streakDays: number
  logsCount: number
  avgMood: number
  avgEnergy: number
  domainsTouched: string[]
  habitsCompletionRate: number
  goalsProgress: number
}

export const DEFAULT_KPIS: KpiDefinition[] = [
  { id: 'tasks', name: 'Tasks completed', unit: '', target: 5 },
  { id: 'deep_work', name: 'Deep work (min)', unit: 'min', target: 120 },
  { id: 'xp', name: 'XP gained', unit: 'XP', target: 100 },
  { id: 'streak', name: 'Streak days', unit: 'days', target: 7 },
]

const MOOD_VALUES: Record<string, number> = {
  great: 5, good: 4, okay: 3, bad: 2, terrible: 1,
}

export function aggregateByWeek(metrics: ProductivityMetric[]): Record<string, ProductivityMetric> {
  const byWeek: Record<string, ProductivityMetric> = {}
  for (const m of metrics) {
    const weekStart = getWeekStart(m.date)
    if (!byWeek[weekStart]) {
      byWeek[weekStart] = {
        date: weekStart,
        tasksCompleted: 0,
        deepWorkMinutes: 0,
        xpGained: 0,
        logsCount: 0,
      }
    }
    byWeek[weekStart].tasksCompleted += m.tasksCompleted
    byWeek[weekStart].deepWorkMinutes += m.deepWorkMinutes
    byWeek[weekStart].xpGained += m.xpGained
    byWeek[weekStart].logsCount += m.logsCount
  }
  return byWeek
}

export function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

export function computeTrend(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

/**
 * Calculate period stats for a given date range
 */
export function calculatePeriodStats(
  opportunities: Opportunity[],
  dailyLogs: DailyLog[],
  habits: Habit[],
  goals: Goal[],
  deepWorkMinutes: number,
  xpTotal: number,
  streakDays: number,
  periodStart: Date,
  periodEnd: Date,
): PeriodStats {
  const periodOpps = opportunities.filter(opp => {
    try {
      const created = parseISO(opp.created_at)
      return isWithinInterval(created, { start: periodStart, end: periodEnd })
    } catch { return false }
  })

  const doneOpps = periodOpps.filter(o => o.status === 'done')
  const periodLogs = dailyLogs.filter(log => {
    try {
      const logDate = parseISO(log.log_date || log.created_at)
      return isWithinInterval(logDate, { start: periodStart, end: periodEnd })
    } catch { return false }
  })

  const tasksByStatus: Record<string, number> = {}
  const tasksByDomain: Record<string, number> = {}
  const tasksByType: Record<string, number> = {}

  periodOpps.forEach(opp => {
    tasksByStatus[opp.status] = (tasksByStatus[opp.status] || 0) + 1
    if (opp.domain_id) tasksByDomain[opp.domain_id] = (tasksByDomain[opp.domain_id] || 0) + 1
    tasksByType[opp.type] = (tasksByType[opp.type] || 0) + 1
  })

  const moodValues = periodLogs
    .map(l => MOOD_VALUES[l.mood] || 0)
    .filter(v => v > 0)
  const avgMood = moodValues.length > 0 ? moodValues.reduce((a, b) => a + b, 0) / moodValues.length : 0

  const energyValues = periodLogs
    .map(l => l.energy_level)
    .filter(v => v > 0)
  const avgEnergy = energyValues.length > 0 ? energyValues.reduce((a, b) => a + b, 0) / energyValues.length : 0

  const domainsTouched = [...new Set(periodOpps.filter(o => o.domain_id).map(o => o.domain_id!))]

  // Habit completion rate
  const today = format(new Date(), 'yyyy-MM-dd')
  let habitTotal = 0
  let habitDone = 0
  habits.forEach(h => {
    const days = differenceInDays(periodEnd, periodStart) + 1
    if (h.frequency === 'daily') {
      habitTotal += days * h.target_count
      habitDone += h.completions.filter(c => {
        try {
          const d = parseISO(c)
          return isWithinInterval(d, { start: periodStart, end: periodEnd })
        } catch { return false }
      }).length
    } else {
      habitTotal += h.target_count
      habitDone += h.completions.filter(c => {
        try {
          const d = parseISO(c)
          return isWithinInterval(d, { start: periodStart, end: periodEnd })
        } catch { return false }
      }).length
    }
  })
  const habitsCompletionRate = habitTotal > 0 ? Math.round((habitDone / habitTotal) * 100) : 0

  // Goals progress
  const activeGoals = goals.filter(g => g.progress < 100)
  const goalsProgress = activeGoals.length > 0
    ? Math.round(activeGoals.reduce((sum, g) => sum + g.progress, 0) / activeGoals.length)
    : 0

  return {
    tasksCompleted: doneOpps.length,
    tasksByStatus,
    tasksByDomain,
    tasksByType,
    deepWorkMinutes,
    xpGained: xpTotal,
    streakDays,
    logsCount: periodLogs.length,
    avgMood,
    avgEnergy,
    domainsTouched,
    habitsCompletionRate,
    goalsProgress,
  }
}

/**
 * Compare two periods and generate TimeComparison objects
 */
export function compareWeeks(
  currentStats: PeriodStats,
  previousStats: PeriodStats,
): TimeComparison[] {
  const comparisons: TimeComparison[] = [
    makeComparison('Tasks', currentStats.tasksCompleted, previousStats.tasksCompleted),
    makeComparison('Journal entries', currentStats.logsCount, previousStats.logsCount),
    makeComparison('Avg mood', currentStats.avgMood, previousStats.avgMood),
    makeComparison('Avg energy', currentStats.avgEnergy, previousStats.avgEnergy),
    makeComparison('Habit rate', currentStats.habitsCompletionRate, previousStats.habitsCompletionRate),
    makeComparison('Domains active', currentStats.domainsTouched.length, previousStats.domainsTouched.length),
  ]
  return comparisons
}

function makeComparison(period: string, current: number, previous: number): TimeComparison {
  const changePercent = computeTrend(current, previous)
  let trend: 'up' | 'down' | 'stable' = 'stable'
  if (changePercent > 5) trend = 'up'
  else if (changePercent < -5) trend = 'down'
  return { period, current, previous, changePercent, trend }
}

/**
 * Generate daily data points for the last N days
 */
export function generateDailyDataPoints(
  opportunities: Opportunity[],
  dailyLogs: DailyLog[],
  days: number = 30,
): { date: string; tasks: number; logs: number; mood: number }[] {
  const now = new Date()
  const result: { date: string; tasks: number; logs: number; mood: number }[] = []

  for (let i = days - 1; i >= 0; i--) {
    const day = subDays(now, i)
    const dayStr = format(day, 'yyyy-MM-dd')

    const dayTasks = opportunities.filter(o => {
      if (o.status !== 'done') return false
      try { return format(parseISO(o.created_at), 'yyyy-MM-dd') === dayStr } catch { return false }
    }).length

    const dayLogs = dailyLogs.filter(l => {
      try { return (l.log_date || format(parseISO(l.created_at), 'yyyy-MM-dd')) === dayStr } catch { return false }
    })

    const moodVal = dayLogs.length > 0
      ? dayLogs.reduce((sum, l) => sum + (MOOD_VALUES[l.mood] || 3), 0) / dayLogs.length
      : 0

    result.push({
      date: dayStr,
      tasks: dayTasks,
      logs: dayLogs.length,
      mood: Math.round(moodVal * 10) / 10,
    })
  }

  return result
}

/**
 * Calculate productivity score (0-100) based on multiple factors
 */
export function calculateProductivityScore(stats: PeriodStats): number {
  let score = 0
  // Tasks: up to 30 points (5 tasks = 30)
  score += Math.min(30, (stats.tasksCompleted / 5) * 30)
  // Deep work: up to 25 points (120 min = 25)
  score += Math.min(25, (stats.deepWorkMinutes / 120) * 25)
  // Streak: up to 20 points (7 days = 20)
  score += Math.min(20, (stats.streakDays / 7) * 20)
  // Journaling: up to 15 points (7 logs = 15)
  score += Math.min(15, (stats.logsCount / 7) * 15)
  // Domain balance: up to 10 points (3+ domains = 10)
  score += Math.min(10, (stats.domainsTouched.length / 3) * 10)

  return Math.round(score)
}
