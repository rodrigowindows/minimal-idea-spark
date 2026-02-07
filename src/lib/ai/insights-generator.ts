/**
 * AI-powered insights from metrics (used by Analytics and generate-insights edge function).
 */

export interface MetricSnapshot {
  tasksCompleted: number
  deepWorkMinutes: number
  xpGained: number
  streakDays: number
  domainsTouched: string[]
}

export interface GeneratedInsight {
  type: 'positive' | 'warning' | 'suggestion'
  title: string
  body: string
  metric?: string
}

const POSITIVE_PATTERNS = [
  { condition: (m: MetricSnapshot) => m.streakDays >= 7, title: 'Streak on fire', body: 'You\'ve maintained a 7+ day streak. Keep the momentum!' },
  { condition: (m: MetricSnapshot) => m.deepWorkMinutes >= 120, title: 'Deep work champion', body: 'Over 2 hours of deep work. Great focus.' },
  { condition: (m: MetricSnapshot) => m.tasksCompleted >= 5, title: 'Productive week', body: 'You completed 5+ tasks this period.' },
]

const WARNING_PATTERNS = [
  { condition: (m: MetricSnapshot) => m.streakDays === 0 && m.xpGained > 0, title: 'Streak broken', body: 'Consider logging daily to rebuild your streak.' },
  { condition: (m: MetricSnapshot) => m.deepWorkMinutes < 30 && m.tasksCompleted > 0, title: 'Shallow focus', body: 'Try blocking 25–50 min for deep work on your top task.' },
]

const SUGGESTION_PATTERNS = [
  { condition: () => true, title: 'Balance domains', body: 'Spread effort across 2–3 life domains for better balance.' },
]

export function generateInsightsFromMetrics(metrics: MetricSnapshot): GeneratedInsight[] {
  const insights: GeneratedInsight[] = []
  for (const p of POSITIVE_PATTERNS) {
    if (p.condition(metrics)) insights.push({ type: 'positive', title: p.title, body: p.body })
  }
  for (const p of WARNING_PATTERNS) {
    if (p.condition(metrics)) insights.push({ type: 'warning', title: p.title, body: p.body })
  }
  for (const p of SUGGESTION_PATTERNS) {
    if (p.condition(metrics)) insights.push({ type: 'suggestion', title: p.title, body: p.body })
  }
  return insights.slice(0, 8)
}
