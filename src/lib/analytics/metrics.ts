/**
 * Productivity metrics and aggregations for Analytics dashboard.
 */

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
}

export interface KpiDefinition {
  id: string
  name: string
  unit: string
  target?: number
}

export const DEFAULT_KPIS: KpiDefinition[] = [
  { id: 'tasks', name: 'Tasks completed', unit: '', target: 5 },
  { id: 'deep_work', name: 'Deep work (min)', unit: 'min', target: 120 },
  { id: 'xp', name: 'XP gained', unit: 'XP', target: 100 },
  { id: 'streak', name: 'Streak days', unit: 'days', target: 7 },
]

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
