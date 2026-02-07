import { corsHeaders } from '../_shared/cors.ts'

interface MetricSnapshot {
  tasks_completed: number
  deep_work_minutes: number
  xp_gained: number
  streak_days: number
  domains_touched: string[]
  avg_mood?: number
  avg_energy?: number
  habits_completion_rate?: number
  goals_progress?: number
  level?: number
}

interface GeneratedInsight {
  type: 'positive' | 'warning' | 'suggestion' | 'prediction'
  title: string
  body: string
  priority: number
  category: string
  metric?: string
}

function generateInsights(metrics: MetricSnapshot): GeneratedInsight[] {
  const insights: GeneratedInsight[] = []

  // Positive patterns
  if (metrics.streak_days >= 30) {
    insights.push({ type: 'positive', title: 'Monthly milestone', body: '30+ day streak! You\'re building powerful habits.', priority: 9, category: 'streak' })
  } else if (metrics.streak_days >= 7) {
    insights.push({ type: 'positive', title: 'Streak on fire', body: "You've maintained a 7+ day streak. Keep the momentum!", priority: 7, category: 'streak' })
  }

  if (metrics.deep_work_minutes >= 300) {
    insights.push({ type: 'positive', title: 'Flow state master', body: '5+ hours of deep work! Exceptional concentration.', priority: 9, category: 'focus' })
  } else if (metrics.deep_work_minutes >= 120) {
    insights.push({ type: 'positive', title: 'Deep work champion', body: 'Over 2 hours of deep work. Great focus.', priority: 7, category: 'focus' })
  }

  if (metrics.tasks_completed >= 10) {
    insights.push({ type: 'positive', title: 'Execution machine', body: '10+ tasks completed! Outstanding execution rate.', priority: 8, category: 'productivity' })
  } else if (metrics.tasks_completed >= 5) {
    insights.push({ type: 'positive', title: 'Productive week', body: 'You completed 5+ tasks this period.', priority: 6, category: 'productivity' })
  }

  if (metrics.domains_touched.length >= 3) {
    insights.push({ type: 'positive', title: 'Well-balanced', body: 'You\'re working across 3+ life domains. Great balance!', priority: 6, category: 'balance' })
  }

  if (metrics.xp_gained >= 1000) {
    insights.push({ type: 'positive', title: 'XP milestone', body: 'Over 1000 XP earned. You\'re progressing fast!', priority: 7, category: 'productivity' })
  }

  // Warning patterns
  if (metrics.streak_days === 0 && metrics.xp_gained > 0) {
    insights.push({ type: 'warning', title: 'Streak broken', body: 'Consider logging daily to rebuild your streak.', priority: 8, category: 'streak' })
  }

  if (metrics.deep_work_minutes < 30 && metrics.tasks_completed > 0) {
    insights.push({ type: 'warning', title: 'Shallow focus', body: 'Try blocking 25-50 min for deep work on your top task.', priority: 7, category: 'focus' })
  }

  if (metrics.domains_touched.length <= 1 && metrics.tasks_completed > 0) {
    insights.push({ type: 'warning', title: 'Domain tunnel vision', body: 'You\'re only working on 1 domain. Consider diversifying.', priority: 5, category: 'balance' })
  }

  if (metrics.tasks_completed === 0 && metrics.xp_gained === 0) {
    insights.push({ type: 'warning', title: 'Inactive period', body: 'No tasks or XP logged. Set a small win for today!', priority: 9, category: 'productivity' })
  }

  // Wellbeing insights
  if (metrics.avg_mood !== undefined && metrics.avg_mood > 0 && metrics.avg_mood < 2.5) {
    insights.push({ type: 'warning', title: 'Low mood detected', body: 'Your average mood is below neutral. Consider taking a break or reflecting on what\'s weighing on you.', priority: 8, category: 'wellbeing' })
  }

  if (metrics.avg_energy !== undefined && metrics.avg_energy > 0 && metrics.avg_energy < 4) {
    insights.push({ type: 'suggestion', title: 'Energy management', body: 'Your energy levels are low. Try scheduling important tasks during your peak energy hours.', priority: 6, category: 'wellbeing' })
  }

  // Habits & goals
  if (metrics.habits_completion_rate !== undefined && metrics.habits_completion_rate > 0 && metrics.habits_completion_rate < 50) {
    insights.push({ type: 'warning', title: 'Low habit completion', body: `Only ${metrics.habits_completion_rate}% habits completed. Focus on your most impactful habit first.`, priority: 6, category: 'habits' })
  }

  if (metrics.goals_progress !== undefined && metrics.goals_progress > 0 && metrics.goals_progress >= 80) {
    insights.push({ type: 'positive', title: 'Goals nearly complete', body: `${metrics.goals_progress}% average progress on active goals. The finish line is close!`, priority: 7, category: 'productivity' })
  }

  // Suggestions
  if (metrics.deep_work_minutes > 0 && metrics.deep_work_minutes < 120) {
    insights.push({ type: 'suggestion', title: 'Increase deep work', body: 'You\'re doing some deep work. Try to reach 2 hours for optimal results.', priority: 4, category: 'focus' })
  }

  if (metrics.streak_days >= 3 && metrics.streak_days < 7) {
    insights.push({ type: 'suggestion', title: 'Almost there!', body: `${7 - metrics.streak_days} more days to hit a 7-day streak. Stay consistent!`, priority: 5, category: 'streak' })
  }

  if (metrics.tasks_completed >= 3 && metrics.tasks_completed < 5) {
    insights.push({ type: 'suggestion', title: 'Push for 5', body: 'You\'re close to 5 completed tasks. One more push!', priority: 4, category: 'productivity' })
  }

  // Predictions
  if (metrics.streak_days >= 3) {
    insights.push({ type: 'prediction', title: 'Streak forecast', body: `At your current pace, you'll reach a ${metrics.streak_days + 7}-day streak by next week.`, priority: 5, category: 'streak' })
  }

  if (metrics.xp_gained > 0 && metrics.streak_days > 0) {
    const xpPerDay = metrics.xp_gained / metrics.streak_days
    insights.push({ type: 'prediction', title: 'XP velocity', body: `Averaging ~${Math.round(xpPerDay)} XP/day. At this rate you'll gain ${Math.round(xpPerDay * 30)} XP this month.`, priority: 4, category: 'productivity' })
  }

  if (metrics.level !== undefined && metrics.xp_gained > 0 && metrics.streak_days > 0) {
    const xpPerDay = metrics.xp_gained / metrics.streak_days
    const xpNeeded = 1000 * Math.pow(metrics.level, 1.5)
    const daysToLevel = Math.ceil(xpNeeded / xpPerDay)
    if (daysToLevel < 365) {
      insights.push({ type: 'prediction', title: 'Level-up estimate', body: `Based on ~${Math.round(xpPerDay)} XP/day, you could reach level ${metrics.level + 1} in ~${daysToLevel} days.`, priority: 4, category: 'productivity' })
    }
  }

  // Sort by priority descending
  insights.sort((a, b) => b.priority - a.priority)
  return insights.slice(0, 10)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    let body: MetricSnapshot
    try {
      body = (await req.json()) as MetricSnapshot
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    if (body.tasks_completed === undefined || body.deep_work_minutes === undefined) {
      return new Response(JSON.stringify({ error: 'Missing required fields: tasks_completed, deep_work_minutes' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const insights = generateInsights(body)

    return new Response(JSON.stringify({
      insights,
      generated_at: new Date().toISOString(),
      metrics_summary: {
        tasks: body.tasks_completed,
        deep_work_hours: Math.round(body.deep_work_minutes / 60 * 10) / 10,
        streak: body.streak_days,
        domains: body.domains_touched.length,
        xp: body.xp_gained,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
