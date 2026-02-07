import { corsHeaders } from '../_shared/cors.ts'

interface MetricSnapshot {
  tasks_completed: number
  deep_work_minutes: number
  xp_gained: number
  streak_days: number
  domains_touched: string[]
}

interface GeneratedInsight {
  type: 'positive' | 'warning' | 'suggestion'
  title: string
  body: string
  metric?: string
}

function generateInsights(metrics: MetricSnapshot): GeneratedInsight[] {
  const insights: GeneratedInsight[] = []
  if (metrics.streak_days >= 7) {
    insights.push({ type: 'positive', title: 'Streak on fire', body: "You've maintained a 7+ day streak. Keep the momentum!" })
  }
  if (metrics.deep_work_minutes >= 120) {
    insights.push({ type: 'positive', title: 'Deep work champion', body: 'Over 2 hours of deep work. Great focus.' })
  }
  if (metrics.tasks_completed >= 5) {
    insights.push({ type: 'positive', title: 'Productive week', body: 'You completed 5+ tasks this period.' })
  }
  if (metrics.streak_days === 0 && metrics.xp_gained > 0) {
    insights.push({ type: 'warning', title: 'Streak broken', body: 'Consider logging daily to rebuild your streak.' })
  }
  if (metrics.deep_work_minutes < 30 && metrics.tasks_completed > 0) {
    insights.push({ type: 'suggestion', title: 'Shallow focus', body: 'Try blocking 25–50 min for deep work on your top task.' })
  }
  insights.push({ type: 'suggestion', title: 'Balance domains', body: 'Spread effort across 2–3 life domains for better balance.' })
  return insights.slice(0, 8)
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
    const insights = generateInsights(body)
    return new Response(JSON.stringify({ insights }), {
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
