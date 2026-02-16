import { useMemo, useRef, useState } from 'react'
import { endOfWeek, format, isWithinInterval, parseISO, startOfWeek, subDays } from 'date-fns'

import { useXPSystem } from '@/hooks/useXPSystem'
import { useLocalData } from '@/hooks/useLocalData'
import { GAMIFICATION_CONFIG } from '@/lib/constants'
import {
  calculateProductivityScore,
  generateDailyDataPoints,
  type PeriodStats,
} from '@/lib/analytics/metrics'
import { exportToCSV, type ExportRow } from '@/lib/analytics/export'
import { predictTrend, type DataPoint } from '@/lib/analytics/predictions'
import {
  generateInsightsFromMetrics,
  generatePredictionInsights,
  type GeneratedInsight,
} from '@/lib/ai/insights-generator'

const STATUS_COLORS: Record<string, string> = {
  backlog: '#6b7280',
  doing: '#3b82f6',
  review: '#f59e0b',
  done: '#22c55e',
}

const TYPE_COLORS: Record<string, string> = {
  action: '#3b82f6',
  study: '#8b5cf6',
  insight: '#f59e0b',
  networking: '#ec4899',
}

export function useAnalyticsDashboard() {
  const { opportunities, domains, dailyLogs, habits, goals, isLoading, weeklyTargets } = useLocalData()
  const {
    level,
    xpTotal,
    levelTitle,
    achievements,
    streakDays,
    deepWorkMinutes,
    opportunitiesCompleted,
    resetXP,
  } = useXPSystem()
  const [dashboardTab, setDashboardTab] = useState('overview')
  const printRef = useRef<HTMLDivElement>(null)

  const allAchievements = GAMIFICATION_CONFIG.ACHIEVEMENTS
  const unlockedNames = useMemo(() => new Set(achievements.map((item) => item.name)), [achievements])

  const weeklyDomainStats = useMemo(() => {
    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
    const stats: Record<string, number> = {}

    opportunities.forEach((opportunity) => {
      if (opportunity.status !== 'done' || !opportunity.domain_id) return
      try {
        const created = parseISO(opportunity.created_at)
        if (isWithinInterval(created, { start: weekStart, end: weekEnd })) {
          stats[opportunity.domain_id] = (stats[opportunity.domain_id] || 0) + 1
        }
      } catch {
        // Ignore invalid dates
      }
    })
    return stats
  }, [opportunities])

  const hasTargets = useMemo(
    () =>
      weeklyTargets.length > 0 &&
      weeklyTargets.some((target) => target.opportunities_target > 0 || target.hours_target > 0),
    [weeklyTargets],
  )

  const metricsForInsights = useMemo(
    () => ({
      tasksCompleted: opportunitiesCompleted,
      deepWorkMinutes,
      xpGained: xpTotal,
      streakDays,
      domainsTouched: Array.from(
        new Set(opportunities.filter((opportunity) => opportunity.domain_id).map((opportunity) => opportunity.domain_id!)),
      ),
    }),
    [opportunitiesCompleted, deepWorkMinutes, xpTotal, streakDays, opportunities],
  )

  const insights: GeneratedInsight[] = useMemo(
    () => generateInsightsFromMetrics(metricsForInsights),
    [metricsForInsights],
  )
  const predictionInsights = useMemo(
    () => generatePredictionInsights(streakDays, xpTotal, opportunitiesCompleted, level),
    [streakDays, xpTotal, opportunitiesCompleted, level],
  )
  const allInsights = useMemo(
    () => [...insights, ...predictionInsights].slice(0, 10),
    [insights, predictionInsights],
  )

  const weeklyChartData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    return days.map((day, index) => ({
      day,
      xp: Math.floor(Math.random() * 60) + 20 + (index % 3) * 10,
      tasks: Math.floor(Math.random() * 3) + 1,
    }))
  }, [])

  const domainChartData = useMemo(() => {
    if (!domains.length) return []
    const counts: Record<string, number> = {}
    opportunities.forEach((opportunity) => {
      if (opportunity.domain_id) {
        counts[opportunity.domain_id] = (counts[opportunity.domain_id] || 0) + 1
      }
    })
    return domains.map((domain) => ({
      name: domain.name,
      value: counts[domain.id] || 0,
      fill: domain.color_theme,
    }))
  }, [domains, opportunities])

  const dailyData = useMemo(
    () => generateDailyDataPoints(opportunities, dailyLogs, 30),
    [opportunities, dailyLogs],
  )

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {}
    opportunities.forEach((opportunity) => {
      counts[opportunity.status] = (counts[opportunity.status] || 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      fill: STATUS_COLORS[name] || '#6b7280',
    }))
  }, [opportunities])

  const typeData = useMemo(() => {
    const counts: Record<string, number> = {}
    opportunities.forEach((opportunity) => {
      counts[opportunity.type] = (counts[opportunity.type] || 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      fill: TYPE_COLORS[name] || '#6b7280',
    }))
  }, [opportunities])

  const kpiValues = useMemo(
    () => ({
      tasks: opportunitiesCompleted,
      deep_work: deepWorkMinutes,
      xp: xpTotal,
      streak: streakDays,
    }),
    [opportunitiesCompleted, deepWorkMinutes, xpTotal, streakDays],
  )

  const predictionPoints: DataPoint[] = useMemo(
    () =>
      [0, 1, 2, 3, 4, 5, 6].map((index) => ({
        date: format(subDays(new Date(), 6 - index), 'yyyy-MM-dd'),
        value: opportunitiesCompleted + Math.floor(Math.random() * 3) - 1,
      })),
    [opportunitiesCompleted],
  )
  const prediction = useMemo(() => predictTrend(predictionPoints, 'tasks'), [predictionPoints])

  const productivityScore = useMemo(() => {
    const stats: PeriodStats = {
      tasksCompleted: opportunitiesCompleted,
      tasksByStatus: {},
      tasksByDomain: {},
      tasksByType: {},
      deepWorkMinutes,
      xpGained: xpTotal,
      streakDays,
      logsCount: dailyLogs.length,
      avgMood: 0,
      avgEnergy: 0,
      domainsTouched: Array.from(
        new Set(opportunities.filter((opportunity) => opportunity.domain_id).map((opportunity) => opportunity.domain_id!)),
      ),
      habitsCompletionRate: 0,
      goalsProgress: 0,
    }
    return calculateProductivityScore(stats)
  }, [opportunitiesCompleted, deepWorkMinutes, xpTotal, streakDays, dailyLogs, opportunities])

  const csvRows: ExportRow[] = useMemo(() => {
    const rows: ExportRow[] = [
      { metric: 'Tasks completed', value: opportunitiesCompleted, period: 'all' },
      { metric: 'Deep work (min)', value: deepWorkMinutes, period: 'all' },
      { metric: 'XP total', value: xpTotal, period: 'all' },
      { metric: 'Streak days', value: streakDays, period: 'all' },
      { metric: 'Productivity score', value: productivityScore, period: 'all' },
      { metric: 'Journal entries', value: dailyLogs.length, period: 'all' },
      { metric: 'Habits count', value: habits.length, period: 'all' },
      { metric: 'Goals count', value: goals.length, period: 'all' },
    ]
    domains.forEach((domain) => {
      const count = opportunities.filter((opportunity) => opportunity.domain_id === domain.id).length
      rows.push({ metric: `Domain: ${domain.name}`, value: count, period: 'all' })
    })
    allInsights.forEach((insight, index) => {
      rows.push({
        metric: `Insight ${index + 1}`,
        value: `[${insight.type}] ${insight.title}: ${insight.body}`,
        period: 'all',
      })
    })
    return rows
  }, [
    opportunitiesCompleted,
    deepWorkMinutes,
    xpTotal,
    streakDays,
    productivityScore,
    dailyLogs,
    habits,
    goals,
    domains,
    opportunities,
    allInsights,
  ])

  const handleExportCSV = () => {
    exportToCSV(csvRows, `analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`)
  }

  const handlePrint = () => {
    if (!printRef.current) {
      window.print()
      return
    }

    const popup = window.open('', '_blank')
    if (!popup) {
      window.print()
      return
    }
    popup.document.write(`
      <!DOCTYPE html><html><head><title>LifeOS Analytics Report</title>
      <style>body{ font-family: system-ui; padding: 24px; } .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px; }</style></head>
      <body>${printRef.current.innerHTML}</body></html>`)
    popup.document.close()
    popup.onload = () => {
      popup.print()
      popup.close()
    }
  }

  return {
    opportunities,
    domains,
    dailyLogs,
    habits,
    goals,
    isLoading,
    level,
    xpTotal,
    levelTitle,
    achievements,
    streakDays,
    deepWorkMinutes,
    opportunitiesCompleted,
    resetXP,
    dashboardTab,
    setDashboardTab,
    allAchievements,
    unlockedNames,
    weeklyDomainStats,
    hasTargets,
    allInsights,
    weeklyChartData,
    domainChartData,
    dailyData,
    statusData,
    typeData,
    kpiValues,
    prediction,
    productivityScore,
    printRef,
    handleExportCSV,
    handlePrint,
  }
}

