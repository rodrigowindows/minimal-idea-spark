import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { useLocalData } from '@/hooks/useLocalData'
import { useXPSystem } from '@/hooks/useXPSystem'
import { SCORECARD_THRESHOLDS, calculateXPReward } from '@/lib/constants'
import { toast } from 'sonner'
import {
  ClipboardCheck,
  TrendingUp,
  TrendingDown,
  Target,
  Brain,
  Flame,
  Zap,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Send,
} from 'lucide-react'
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns'

export function WeeklyReview() {
  const { opportunities, dailyLogs, habits, domains } = useLocalData()
  const { xpTotal, streakDays, deepWorkMinutes, opportunitiesCompleted, level, addXP } = useXPSystem()
  const [reflections, setReflections] = useState('')
  const [nextWeekPlan, setNextWeekPlan] = useState('')
  const [saved, setSaved] = useState(false)

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 })

  const weekStats = useMemo(() => {
    const doneThisWeek = opportunities.filter(o => o.status === 'done').length
    const doingCount = opportunities.filter(o => o.status === 'doing').length
    const backlogCount = opportunities.filter(o => o.status === 'backlog').length

    // Domain distribution
    const domainCounts: Record<string, number> = {}
    opportunities.forEach(o => {
      if (o.domain_id) {
        const name = o.domain?.name || o.domain_id
        domainCounts[name] = (domainCounts[name] || 0) + 1
      }
    })

    // XP breakdown by type
    const xpByType = { study: 0, action: 0, insight: 0, networking: 0 }
    opportunities.filter(o => o.status === 'done').forEach(o => {
      const xp = calculateXPReward(o.type, o.strategic_value ?? 5)
      xpByType[o.type] += xp
    })

    // Mood trend from journal
    const moods = dailyLogs
      .filter(l => l.mood)
      .map(l => {
        switch (l.mood) {
          case 'great': return 5
          case 'good': return 4
          case 'okay': return 3
          case 'bad': return 2
          case 'terrible': return 1
          default: return 3
        }
      })
    const avgMood = moods.length > 0 ? moods.reduce((a, b) => a + b, 0) / moods.length : 0

    // Top opportunity by XP
    const topOpp = opportunities
      .filter(o => o.status === 'done')
      .sort((a, b) => calculateXPReward(b.type, b.strategic_value ?? 5) - calculateXPReward(a.type, a.strategic_value ?? 5))[0]

    // Habit completions this week
    const weekDays: string[] = []
    for (let i = 0; i < 7; i++) {
      weekDays.push(format(subDays(new Date(), i), 'yyyy-MM-dd'))
    }
    const habitCompletions = habits.reduce((total, h) => {
      return total + h.completions.filter(d => weekDays.includes(d)).length
    }, 0)
    const totalHabitSlots = habits.length * 7

    return {
      doneThisWeek,
      doingCount,
      backlogCount,
      domainCounts,
      xpByType,
      avgMood,
      topOpp,
      habitCompletions,
      totalHabitSlots,
      deepWorkHours: Math.floor(deepWorkMinutes / 60),
    }
  }, [opportunities, dailyLogs, habits, deepWorkMinutes])

  // Calculate overall score
  const overallScore = useMemo(() => {
    let score = 0
    score += Math.min(xpTotal / (SCORECARD_THRESHOLDS.XP_GOAL_DAILY * 7), 1) * 25
    score += Math.min(opportunitiesCompleted / SCORECARD_THRESHOLDS.OPPORTUNITIES_GOAL_WEEKLY, 1) * 25
    score += Math.min((deepWorkMinutes / 60) / SCORECARD_THRESHOLDS.DEEP_WORK_GOAL_WEEKLY, 1) * 25
    score += Math.min(streakDays / 7, 1) * 25
    return Math.round(score)
  }, [xpTotal, opportunitiesCompleted, deepWorkMinutes, streakDays])

  function handleSaveReview() {
    // Save to localStorage
    const reviews = JSON.parse(localStorage.getItem('lifeos_weekly_reviews') || '[]')
    reviews.push({
      id: `review-${Date.now()}`,
      date: new Date().toISOString(),
      score: overallScore,
      reflections,
      nextWeekPlan,
      stats: weekStats,
    })
    localStorage.setItem('lifeos_weekly_reviews', JSON.stringify(reviews))
    addXP(50)
    setSaved(true)
    toast.success(
      <div className="flex items-center gap-2">
        <span>Weekly review saved!</span>
        <Badge variant="secondary" className="gap-1 bg-amber-500/20 text-amber-400">
          <Zap className="h-3 w-3" />+50 XP
        </Badge>
      </div>
    )
  }

  // Generate AI-style insights
  const insights = useMemo(() => {
    const items: { type: 'success' | 'warning' | 'tip'; text: string }[] = []

    if (streakDays >= 7) items.push({ type: 'success', text: `Amazing ${streakDays}-day streak! Consistency is key.` })
    if (streakDays === 0) items.push({ type: 'warning', text: 'Streak broken. Start fresh today!' })
    if (weekStats.deepWorkHours >= 10) items.push({ type: 'success', text: `${weekStats.deepWorkHours}h of deep work. Outstanding focus!` })
    if (weekStats.deepWorkHours < 3) items.push({ type: 'warning', text: 'Low deep work hours. Try blocking 2h daily for focused sessions.' })
    if (weekStats.avgMood >= 4) items.push({ type: 'success', text: 'Your mood has been great this week. Keep it up!' })
    if (weekStats.avgMood > 0 && weekStats.avgMood < 3) items.push({ type: 'warning', text: 'Mood trending low. Consider rest or lighter tasks.' })

    const domainEntries = Object.entries(weekStats.domainCounts)
    if (domainEntries.length > 0) {
      const max = domainEntries.sort((a, b) => b[1] - a[1])[0]
      const total = domainEntries.reduce((s, [, v]) => s + v, 0)
      const pct = Math.round((max[1] / total) * 100)
      if (pct > 50) {
        items.push({ type: 'tip', text: `${max[0]} dominates at ${pct}%. Consider balancing with other domains.` })
      }
    }

    if (weekStats.backlogCount > 10) items.push({ type: 'tip', text: `${weekStats.backlogCount} items in backlog. Prioritize or eliminate some.` })
    if (items.length === 0) items.push({ type: 'tip', text: 'Keep tracking your activities to get personalized insights.' })

    return items
  }, [streakDays, weekStats])

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Weekly Review</h1>
            <p className="text-sm text-muted-foreground">
              {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          {/* Score overview */}
          <Card className="rounded-xl">
            <CardContent className="pt-6">
              <div className="flex items-center gap-6">
                <div className={cn(
                  'flex h-24 w-24 shrink-0 items-center justify-center rounded-full text-3xl font-bold',
                  overallScore >= 80 ? 'bg-green-500/20 text-green-400' :
                  overallScore >= 50 ? 'bg-amber-500/20 text-amber-400' :
                  'bg-red-500/20 text-red-400'
                )}>
                  {overallScore}
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-muted-foreground">XP</span>
                      <span>{xpTotal}/{SCORECARD_THRESHOLDS.XP_GOAL_DAILY * 7}</span>
                    </div>
                    <Progress value={Math.min((xpTotal / (SCORECARD_THRESHOLDS.XP_GOAL_DAILY * 7)) * 100, 100)} className="h-2" />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-muted-foreground">Completed</span>
                      <span>{opportunitiesCompleted}/{SCORECARD_THRESHOLDS.OPPORTUNITIES_GOAL_WEEKLY}</span>
                    </div>
                    <Progress value={Math.min((opportunitiesCompleted / SCORECARD_THRESHOLDS.OPPORTUNITIES_GOAL_WEEKLY) * 100, 100)} className="h-2" />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-muted-foreground">Deep Work</span>
                      <span>{weekStats.deepWorkHours}h/{SCORECARD_THRESHOLDS.DEEP_WORK_GOAL_WEEKLY}h</span>
                    </div>
                    <Progress value={Math.min((weekStats.deepWorkHours / SCORECARD_THRESHOLDS.DEEP_WORK_GOAL_WEEKLY) * 100, 100)} className="h-2" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Card className="rounded-xl">
              <CardContent className="py-4 text-center">
                <Zap className="mx-auto h-5 w-5 text-amber-400" />
                <p className="mt-1 text-xl font-bold">{xpTotal}</p>
                <p className="text-xs text-muted-foreground">XP Earned</p>
              </CardContent>
            </Card>
            <Card className="rounded-xl">
              <CardContent className="py-4 text-center">
                <Target className="mx-auto h-5 w-5 text-green-400" />
                <p className="mt-1 text-xl font-bold">{weekStats.doneThisWeek}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </CardContent>
            </Card>
            <Card className="rounded-xl">
              <CardContent className="py-4 text-center">
                <Brain className="mx-auto h-5 w-5 text-purple-400" />
                <p className="mt-1 text-xl font-bold">{weekStats.deepWorkHours}h</p>
                <p className="text-xs text-muted-foreground">Deep Work</p>
              </CardContent>
            </Card>
            <Card className="rounded-xl">
              <CardContent className="py-4 text-center">
                <Flame className="mx-auto h-5 w-5 text-orange-400" />
                <p className="mt-1 text-xl font-bold">{streakDays}</p>
                <p className="text-xs text-muted-foreground">Day Streak</p>
              </CardContent>
            </Card>
          </div>

          {/* Reflections */}
          <Card className="rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Reflections</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  What went well this week?
                </label>
                <Textarea
                  value={reflections}
                  onChange={(e) => setReflections(e.target.value)}
                  placeholder="Celebrate your wins, big and small..."
                  rows={3}
                  className="resize-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Plan for next week
                </label>
                <Textarea
                  value={nextWeekPlan}
                  onChange={(e) => setNextWeekPlan(e.target.value)}
                  placeholder="Top 3 priorities for next week..."
                  rows={3}
                  className="resize-none"
                />
              </div>
              <Button
                onClick={handleSaveReview}
                disabled={saved}
                className="gap-2"
              >
                {saved ? (
                  <><CheckCircle2 className="h-4 w-4" />Saved!</>
                ) : (
                  <><Send className="h-4 w-4" />Save Review</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6 lg:col-span-4">
          {/* AI Insights */}
          <Card className="rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lightbulb className="h-5 w-5 text-amber-400" />
                Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {insights.map((insight, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex gap-2 rounded-lg p-2 text-sm',
                    insight.type === 'success' && 'bg-green-500/10 text-green-400',
                    insight.type === 'warning' && 'bg-amber-500/10 text-amber-400',
                    insight.type === 'tip' && 'bg-blue-500/10 text-blue-400'
                  )}
                >
                  {insight.type === 'success' && <TrendingUp className="mt-0.5 h-4 w-4 shrink-0" />}
                  {insight.type === 'warning' && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
                  {insight.type === 'tip' && <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />}
                  <span>{insight.text}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Domain breakdown */}
          <Card className="rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Domain Focus</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(weekStats.domainCounts).map(([name, count]) => {
                const domain = domains.find(d => d.name === name)
                const total = Object.values(weekStats.domainCounts).reduce((s, v) => s + v, 0)
                const pct = total > 0 ? Math.round((count / total) * 100) : 0
                return (
                  <div key={name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: domain?.color_theme ?? '#6b7280' }} />
                        <span>{name}</span>
                      </div>
                      <span className="text-muted-foreground">{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: domain?.color_theme ?? '#6b7280' }}
                      />
                    </div>
                  </div>
                )
              })}
              {Object.keys(weekStats.domainCounts).length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">No domain data yet</p>
              )}
            </CardContent>
          </Card>

          {/* Habits summary */}
          {weekStats.totalHabitSlots > 0 && (
            <Card className="rounded-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Habit Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-3xl font-bold">
                    {Math.round((weekStats.habitCompletions / weekStats.totalHabitSlots) * 100)}%
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {weekStats.habitCompletions}/{weekStats.totalHabitSlots} completions
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
