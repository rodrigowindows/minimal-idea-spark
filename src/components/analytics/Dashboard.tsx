import { useMemo } from 'react'
import { WeeklyScorecard } from './WeeklyScorecard'
import { ActivityHeatmap } from './ActivityHeatmap'
import { Charts } from './Charts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useXPSystem } from '@/hooks/useXPSystem'
import { useLocalData } from '@/hooks/useLocalData'
import { generateInsightsFromMetrics, type GeneratedInsight } from '@/lib/ai/insights-generator'
import { Lightbulb, TrendingUp, AlertTriangle } from 'lucide-react'
import type { Opportunity, LifeDomain } from '@/types'

interface DashboardProps {
  opportunities?: Opportunity[]
  domains?: LifeDomain[]
  isLoading?: boolean
}

export function AnalyticsDashboard({ opportunities = [], domains = [], isLoading }: DashboardProps) {
  const { streakDays, deepWorkMinutes, opportunitiesCompleted, xpTotal } = useXPSystem()
  const { weeklyTargets } = useLocalData()

  const metrics = useMemo(() => ({
    tasksCompleted: opportunitiesCompleted,
    deepWorkMinutes,
    xpGained: xpTotal,
    streakDays,
    domainsTouched: Array.from(new Set(opportunities.filter(o => o.domain_id).map(o => o.domain_id!))),
  }), [opportunitiesCompleted, deepWorkMinutes, xpTotal, streakDays, opportunities])

  const insights: GeneratedInsight[] = useMemo(
    () => generateInsightsFromMetrics(metrics),
    [metrics]
  )

  const weeklyChartData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    return days.map((day, i) => ({
      day,
      xp: Math.floor(Math.random() * 60) + 20 + (i % 3) * 10,
      tasks: Math.floor(Math.random() * 3) + 1,
    }))
  }, [])

  const domainChartData = useMemo(() => {
    if (!domains.length) return []
    const counts: Record<string, number> = {}
    opportunities.forEach(o => {
      if (o.domain_id) counts[o.domain_id] = (counts[o.domain_id] || 0) + 1
    })
    return domains.map(d => ({ name: d.name, value: counts[d.id] || 0, fill: d.color_theme }))
  }, [domains, opportunities])

  return (
    <div className="space-y-6">
      <WeeklyScorecard opportunities={isLoading ? undefined : opportunities} domains={isLoading ? undefined : domains} />
      <Charts weeklyData={weeklyChartData} domainData={domainChartData} />
      <ActivityHeatmap />

      {insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="h-5 w-5 text-amber-400" />
              AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.map((insight, i) => (
              <div
                key={i}
                className={`flex gap-3 rounded-lg p-3 text-sm ${
                  insight.type === 'positive' ? 'bg-green-500/10 border border-green-500/20' :
                  insight.type === 'warning' ? 'bg-amber-500/10 border border-amber-500/20' :
                  'bg-muted/50'
                }`}
              >
                {insight.type === 'positive' && <TrendingUp className="h-4 w-4 shrink-0 text-green-500" />}
                {insight.type === 'warning' && <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />}
                <div>
                  <p className="font-medium">{insight.title}</p>
                  <p className="text-muted-foreground">{insight.body}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {weeklyTargets.length > 0 && <div className="text-xs text-muted-foreground">Weekly targets configured in Settings.</div>}
    </div>
  )
}
