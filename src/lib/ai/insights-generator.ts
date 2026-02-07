/**
 * AI-powered insights from metrics (used by Analytics and generate-insights edge function).
 * Enhanced with richer pattern detection, scoring, and actionable recommendations.
 */

import type { PeriodStats, TimeComparison } from '@/lib/analytics/metrics'

export interface MetricSnapshot {
  tasksCompleted: number
  deepWorkMinutes: number
  xpGained: number
  streakDays: number
  domainsTouched: string[]
}

export interface GeneratedInsight {
  type: 'positive' | 'warning' | 'suggestion' | 'prediction'
  title: string
  body: string
  metric?: string
  priority?: number // 1-10, higher = more important
  category?: 'productivity' | 'focus' | 'balance' | 'streak' | 'habits' | 'wellbeing'
}

const POSITIVE_PATTERNS = [
  { condition: (m: MetricSnapshot) => m.streakDays >= 7, title: 'Streak on fire', body: 'You\'ve maintained a 7+ day streak. Keep the momentum!', priority: 7, category: 'streak' as const },
  { condition: (m: MetricSnapshot) => m.streakDays >= 30, title: 'Monthly milestone', body: '30+ day streak! You\'re building powerful habits.', priority: 9, category: 'streak' as const },
  { condition: (m: MetricSnapshot) => m.deepWorkMinutes >= 120, title: 'Deep work champion', body: 'Over 2 hours of deep work. Great focus.', priority: 7, category: 'focus' as const },
  { condition: (m: MetricSnapshot) => m.deepWorkMinutes >= 300, title: 'Flow state master', body: '5+ hours of deep work! Exceptional concentration.', priority: 9, category: 'focus' as const },
  { condition: (m: MetricSnapshot) => m.tasksCompleted >= 5, title: 'Productive week', body: 'You completed 5+ tasks this period.', priority: 6, category: 'productivity' as const },
  { condition: (m: MetricSnapshot) => m.tasksCompleted >= 10, title: 'Execution machine', body: '10+ tasks completed! Outstanding execution rate.', priority: 8, category: 'productivity' as const },
  { condition: (m: MetricSnapshot) => m.domainsTouched.length >= 3, title: 'Well-balanced', body: 'You\'re working across 3+ life domains. Great balance!', priority: 6, category: 'balance' as const },
  { condition: (m: MetricSnapshot) => m.xpGained >= 1000, title: 'XP milestone', body: 'Over 1000 XP earned. You\'re progressing fast!', priority: 7, category: 'productivity' as const },
]

const WARNING_PATTERNS = [
  { condition: (m: MetricSnapshot) => m.streakDays === 0 && m.xpGained > 0, title: 'Streak broken', body: 'Consider logging daily to rebuild your streak.', priority: 8, category: 'streak' as const },
  { condition: (m: MetricSnapshot) => m.deepWorkMinutes < 30 && m.tasksCompleted > 0, title: 'Shallow focus', body: 'Try blocking 25-50 min for deep work on your top task.', priority: 7, category: 'focus' as const },
  { condition: (m: MetricSnapshot) => m.domainsTouched.length <= 1 && m.tasksCompleted > 0, title: 'Domain tunnel vision', body: 'You\'re only working on 1 domain. Consider diversifying.', priority: 5, category: 'balance' as const },
  { condition: (m: MetricSnapshot) => m.tasksCompleted === 0 && m.xpGained === 0, title: 'Inactive period', body: 'No tasks or XP logged. Set a small win for today!', priority: 9, category: 'productivity' as const },
]

const SUGGESTION_PATTERNS = [
  { condition: (m: MetricSnapshot) => m.deepWorkMinutes > 0 && m.deepWorkMinutes < 120, title: 'Increase deep work', body: 'You\'re doing some deep work. Try to reach 2 hours for optimal results.', priority: 4, category: 'focus' as const },
  { condition: (m: MetricSnapshot) => m.domainsTouched.length === 2, title: 'Explore more domains', body: 'Spread effort across 3+ life domains for better balance.', priority: 3, category: 'balance' as const },
  { condition: (m: MetricSnapshot) => m.streakDays >= 3 && m.streakDays < 7, title: 'Almost there!', body: 'Just a few more days to hit a 7-day streak. Stay consistent!', priority: 5, category: 'streak' as const },
  { condition: (m: MetricSnapshot) => m.tasksCompleted >= 3 && m.tasksCompleted < 5, title: 'Push for 5', body: 'You\'re close to 5 completed tasks. One more push!', priority: 4, category: 'productivity' as const },
]

export function generateInsightsFromMetrics(metrics: MetricSnapshot): GeneratedInsight[] {
  const insights: GeneratedInsight[] = []
  for (const p of POSITIVE_PATTERNS) {
    if (p.condition(metrics)) insights.push({ type: 'positive', title: p.title, body: p.body, priority: p.priority, category: p.category })
  }
  for (const p of WARNING_PATTERNS) {
    if (p.condition(metrics)) insights.push({ type: 'warning', title: p.title, body: p.body, priority: p.priority, category: p.category })
  }
  for (const p of SUGGESTION_PATTERNS) {
    if (p.condition(metrics)) insights.push({ type: 'suggestion', title: p.title, body: p.body, priority: p.priority, category: p.category })
  }

  // Sort by priority descending
  insights.sort((a, b) => (b.priority || 0) - (a.priority || 0))
  return insights.slice(0, 8)
}

/**
 * Generate comparison-based insights from temporal data
 */
export function generateComparisonInsights(comparisons: TimeComparison[]): GeneratedInsight[] {
  const insights: GeneratedInsight[] = []

  for (const comp of comparisons) {
    if (comp.trend === 'up' && comp.changePercent > 20) {
      insights.push({
        type: 'positive',
        title: `${comp.period} improving`,
        body: `${comp.period} increased by ${comp.changePercent}% compared to last period (${comp.previous} → ${comp.current}).`,
        priority: 5,
        category: 'productivity',
      })
    } else if (comp.trend === 'down' && comp.changePercent < -20) {
      insights.push({
        type: 'warning',
        title: `${comp.period} declining`,
        body: `${comp.period} decreased by ${Math.abs(comp.changePercent)}% compared to last period (${comp.previous} → ${comp.current}).`,
        priority: 6,
        category: 'productivity',
      })
    }
  }

  return insights
}

/**
 * Generate prediction-style insights based on trend data
 */
export function generatePredictionInsights(
  streakDays: number,
  xpTotal: number,
  tasksCompleted: number,
  level: number,
): GeneratedInsight[] {
  const insights: GeneratedInsight[] = []

  // Streak prediction
  if (streakDays >= 3) {
    const projectedStreak = streakDays + 7
    insights.push({
      type: 'prediction',
      title: 'Streak forecast',
      body: `At your current pace, you'll reach a ${projectedStreak}-day streak by next week. ${streakDays >= 7 ? 'You\'re on track for the Unstoppable achievement!' : ''}`,
      priority: 5,
      category: 'streak',
    })
  }

  // XP projection
  if (xpTotal > 0) {
    const xpPerDay = xpTotal / Math.max(1, streakDays || 1)
    const daysToNextLevel = Math.ceil((1000 * Math.pow(level, 1.5) - (xpTotal % (1000 * Math.pow(level, 1.5)))) / xpPerDay)
    if (daysToNextLevel > 0 && daysToNextLevel < 365) {
      insights.push({
        type: 'prediction',
        title: 'Level-up estimate',
        body: `Based on your average ${Math.round(xpPerDay)} XP/day, you could reach level ${level + 1} in ~${daysToNextLevel} days.`,
        priority: 4,
        category: 'productivity',
      })
    }
  }

  // Task velocity
  if (tasksCompleted >= 3) {
    insights.push({
      type: 'prediction',
      title: 'Task velocity',
      body: `You're completing ~${tasksCompleted} tasks per period. Maintaining this pace will lead to significant progress on your goals.`,
      priority: 3,
      category: 'productivity',
    })
  }

  return insights
}
