import { useMemo, useRef } from 'react'
import { WeeklyScorecard } from '@/components/analytics/WeeklyScorecard'
import { ActivityHeatmap } from '@/components/analytics/ActivityHeatmap'
import { Charts } from '@/components/analytics/Charts'
import { XPProgressBar } from '@/components/gamification/XPProgressBar'
import { useXPSystem } from '@/hooks/useXPSystem'
import { useLocalData } from '@/hooks/useLocalData'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { GAMIFICATION_CONFIG } from '@/lib/constants'
import { DEFAULT_KPIS } from '@/lib/analytics/metrics'
import { exportToCSV, type ExportRow } from '@/lib/analytics/export'
import { predictTrend, type DataPoint } from '@/lib/analytics/predictions'
import { generateInsightsFromMetrics, type GeneratedInsight } from '@/lib/ai/insights-generator'
import {
  Trophy, Flame, Brain, Footprints, Scale, Lightbulb, Crown, Star, RotateCcw, Zap, Target,
  Download, FileText, TrendingUp, AlertTriangle,
} from 'lucide-react'
import { startOfWeek, endOfWeek, isWithinInterval, parseISO, subDays, format } from 'date-fns'

const ACHIEVEMENT_ICONS: Record<string, typeof Star> = {
  footprints: Footprints, flame: Flame, brain: Brain, trophy: Trophy,
  scale: Scale, lightbulb: Lightbulb, crown: Crown, star: Star, zap: Zap,
}

export function Analytics() {
  const { opportunities, domains, isLoading, weeklyTargets } = useLocalData()
  const {
    level, xpTotal, levelTitle, achievements, streakDays,
    deepWorkMinutes, opportunitiesCompleted, resetXP,
  } = useXPSystem()

  const allAchievements = GAMIFICATION_CONFIG.ACHIEVEMENTS
  const unlockedNames = new Set(achievements.map(a => a.name))

  const weeklyDomainStats = useMemo(() => {
    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
    const stats: Record<string, number> = {}
    opportunities.forEach(opp => {
      if (opp.status === 'done' && opp.domain_id) {
        try {
          const created = parseISO(opp.created_at)
          if (isWithinInterval(created, { start: weekStart, end: weekEnd })) {
            stats[opp.domain_id] = (stats[opp.domain_id] || 0) + 1
          }
        } catch { /* ignore */ }
      }
    })
    return stats
  }, [opportunities])

  const hasTargets = weeklyTargets.length > 0 && weeklyTargets.some(t => t.opportunities_target > 0 || t.hours_target > 0)

  const metricsForInsights = useMemo(() => ({
    tasksCompleted: opportunitiesCompleted,
    deepWorkMinutes,
    xpGained: xpTotal,
    streakDays,
    domainsTouched: Array.from(new Set(opportunities.filter(o => o.domain_id).map(o => o.domain_id!))),
  }), [opportunitiesCompleted, deepWorkMinutes, xpTotal, streakDays, opportunities])
  const insights: GeneratedInsight[] = useMemo(() => generateInsightsFromMetrics(metricsForInsights), [metricsForInsights])

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
    opportunities.forEach(o => { if (o.domain_id) counts[o.domain_id] = (counts[o.domain_id] || 0) + 1 })
    return domains.map(d => ({ name: d.name, value: counts[d.id] || 0, fill: d.color_theme }))
  }, [domains, opportunities])

  const kpiValues = useMemo(() => ({
    tasks: opportunitiesCompleted,
    deep_work: deepWorkMinutes,
    xp: xpTotal,
    streak: streakDays,
  }), [opportunitiesCompleted, deepWorkMinutes, xpTotal, streakDays])

  const predictionPoints: DataPoint[] = useMemo(() => {
    return [0, 1, 2, 3, 4, 5, 6].map(i => ({
      date: format(subDays(new Date(), 6 - i), 'yyyy-MM-dd'),
      value: opportunitiesCompleted + Math.floor(Math.random() * 3) - 1,
    }))
  }, [opportunitiesCompleted])
  const prediction = useMemo(() => predictTrend(predictionPoints, 'tasks'), [predictionPoints])

  const csvRows: ExportRow[] = useMemo(() => {
    const rows: ExportRow[] = [
      { metric: 'Tasks completed', value: opportunitiesCompleted, period: 'all' },
      { metric: 'Deep work (min)', value: deepWorkMinutes, period: 'all' },
      { metric: 'XP total', value: xpTotal, period: 'all' },
      { metric: 'Streak days', value: streakDays, period: 'all' },
    ]
    domains.forEach(d => {
      const count = opportunities.filter(o => o.domain_id === d.id).length
      rows.push({ metric: `Domain: ${d.name}`, value: count, period: 'all' })
    })
    return rows
  }, [opportunitiesCompleted, deepWorkMinutes, xpTotal, streakDays, domains, opportunities])

  const printRef = useRef<HTMLDivElement>(null)
  const handleExportCSV = () => exportToCSV(csvRows, `analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`)
  const handlePrint = () => {
    if (printRef.current) {
      const win = window.open('', '_blank')
      if (!win) { window.print(); return }
      win.document.write(`
        <!DOCTYPE html><html><head><title>Analytics Report</title>
        <style>body{ font-family: system-ui; padding: 24px; }</style></head>
        <body>${printRef.current.innerHTML}</body></html>`)
      win.document.close()
      win.onload = () => { win.print(); win.close() }
    } else window.print()
  }

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="sr-only" ref={printRef} aria-hidden>
        <h1>Analytics Report</h1>
        <p>Generated {format(new Date(), 'PPpp')}</p>
        <p>Tasks: {opportunitiesCompleted} | Deep work: {deepWorkMinutes} min | XP: {xpTotal} | Streak: {streakDays}</p>
      </div>
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="mb-2 text-2xl font-bold tracking-tight md:text-3xl">Analytics</h1>
          <p className="text-muted-foreground">Track your progress and performance metrics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
            <FileText className="h-4 w-4" /> Print / PDF
          </Button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-6">
          <WeeklyScorecard
            opportunities={isLoading ? undefined : opportunities}
            domains={isLoading ? undefined : domains}
          />
          <Charts weeklyData={weeklyChartData} domainData={domainChartData} />

          <Card className="rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-5 w-5 text-blue-400" />
                KPIs &amp; Metas
              </CardTitle>
              <p className="text-xs text-muted-foreground">Metas personalizados vs valor atual</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {DEFAULT_KPIS.map(kpi => {
                const value = kpiValues[kpi.id as keyof typeof kpiValues] ?? 0
                const target = kpi.target ?? 0
                const pct = target > 0 ? Math.min(Math.round((Number(value) / target) * 100), 100) : 0
                return (
                  <div key={kpi.id} className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{kpi.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {value} {kpi.unit}
                      {target > 0 && ` / ${target} ${kpi.unit}`}
                    </span>
                    {target > 0 && <Progress value={pct} className="h-2 w-24" />}
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card className="rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
                Previsões e tendências
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{prediction.message}</p>
              <Badge variant={prediction.trend === 'up' ? 'default' : prediction.trend === 'down' ? 'destructive' : 'secondary'} className="mt-2">
                {prediction.trend === 'up' ? 'Subindo' : prediction.trend === 'down' ? 'Descendo' : 'Estável'} ({prediction.changePercent}%)
              </Badge>
            </CardContent>
          </Card>

          {insights.length > 0 && (
            <Card className="rounded-xl">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Lightbulb className="h-5 w-5 text-amber-400" /> Insights AI
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {insights.map((insight, i) => (
                  <div
                    key={i}
                    className={`flex gap-3 rounded-lg p-3 text-sm ${
                      insight.type === 'positive' ? 'bg-green-500/10 border border-green-500/20' :
                      insight.type === 'warning' ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-muted/50'
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

          {hasTargets && (
            <Card className="rounded-xl">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="h-5 w-5 text-green-400" />
                  Weekly Goals Progress
                </CardTitle>
                <p className="text-xs text-muted-foreground">Tasks completed this week vs your goals (set in Settings)</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {weeklyTargets
                  .filter(t => t.opportunities_target > 0 || t.hours_target > 0)
                  .map(target => {
                    const domain = domains.find(d => d.id === target.domain_id)
                    if (!domain) return null
                    const completed = weeklyDomainStats[target.domain_id] || 0
                    const oppTarget = target.opportunities_target
                    const oppPercent = oppTarget > 0 ? Math.min(Math.round((completed / oppTarget) * 100), 100) : 0
                    return (
                      <div key={target.domain_id} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: domain.color_theme }} />
                          <span className="text-sm font-medium flex-1">{domain.name}</span>
                          <Badge variant={oppPercent >= 100 ? 'default' : 'secondary'} className="text-xs">
                            {completed}/{oppTarget} tasks
                          </Badge>
                          {target.hours_target > 0 && (
                            <Badge variant="outline" className="text-xs">{target.hours_target}h goal</Badge>
                          )}
                        </div>
                        {oppTarget > 0 && <Progress value={oppPercent} className="h-2" />}
                      </div>
                    )
                  })}
              </CardContent>
            </Card>
          )}

          <ActivityHeatmap />
        </div>

        <div className="space-y-6 lg:col-span-4">
          <Card className="rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Star className="h-5 w-5 text-amber-400" />Level Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-orange-500/25">
                  <span className="text-3xl font-bold text-white">{level}</span>
                </div>
                <div>
                  <p className="text-xl font-semibold">{levelTitle}</p>
                  <p className="text-sm text-muted-foreground">{xpTotal.toLocaleString()} Total XP</p>
                  <p className="text-xs text-muted-foreground">Next: {GAMIFICATION_CONFIG.XP_FOR_LEVEL(level).toLocaleString()} XP</p>
                </div>
              </div>
              <XPProgressBar />
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-muted/50 p-2">
                  <div className="flex items-center justify-center gap-1 text-orange-400">
                    <Flame className="h-4 w-4" /><span className="text-lg font-bold">{streakDays}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Streak</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-2">
                  <div className="flex items-center justify-center gap-1 text-green-400">
                    <Trophy className="h-4 w-4" /><span className="text-lg font-bold">{opportunitiesCompleted}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Done</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-2">
                  <div className="flex items-center justify-center gap-1 text-purple-400">
                    <Brain className="h-4 w-4" /><span className="text-lg font-bold">{Math.floor(deepWorkMinutes / 60)}h</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Focus</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-lg">
                <span className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-purple-400" />Achievements
                </span>
                <Badge variant="secondary">{achievements.length}/{allAchievements.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {allAchievements.map((def) => {
                const isUnlocked = unlockedNames.has(def.name)
                const IconComponent = ACHIEVEMENT_ICONS[def.icon] || Trophy
                return (
                  <div key={def.name}
                    className={`flex items-center gap-3 rounded-lg p-2 transition-colors ${
                      isUnlocked ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20' : 'bg-muted/30 opacity-50'}`}>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      isUnlocked ? 'bg-gradient-to-br from-purple-500 to-pink-500' : 'bg-muted'}`}>
                      <IconComponent className={`h-5 w-5 ${isUnlocked ? 'text-white' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${isUnlocked ? '' : 'text-muted-foreground'}`}>{def.name}</p>
                      <p className="text-xs text-muted-foreground">{def.description}</p>
                    </div>
                    <Badge variant={isUnlocked ? 'default' : 'outline'} className="text-xs">+{def.xp_reward} XP</Badge>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Button variant="outline" className="w-full gap-2 text-muted-foreground" onClick={resetXP}>
            <RotateCcw className="h-4 w-4" />Reset Progress (Dev)
          </Button>
        </div>
      </div>
    </div>
  )
}
