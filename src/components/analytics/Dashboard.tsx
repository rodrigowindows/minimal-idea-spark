import { format } from 'date-fns'
import { PageHeader } from '@/components/layout/PageHeader'
import { WeeklyScorecard } from './WeeklyScorecard'
import { ActivityHeatmap } from './ActivityHeatmap'
import { Charts } from './Charts'
import { XPProgressBar } from '@/components/gamification/XPProgressBar'
import { useAnalyticsDashboard } from '@/hooks/useAnalyticsDashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DEFAULT_KPIS } from '@/lib/analytics/metrics'
import {
  Trophy, Flame, Brain, Footprints, Scale, Lightbulb, Crown, Star, RotateCcw, Zap, Target,
  Download, FileText, TrendingUp, AlertTriangle,
  BarChart3, Sparkles, ChevronRight, Clock, Heart,
} from 'lucide-react'

const ACHIEVEMENT_ICONS: Record<string, typeof Star> = {
  footprints: Footprints, flame: Flame, brain: Brain, trophy: Trophy,
  scale: Scale, lightbulb: Lightbulb, crown: Crown, star: Star, zap: Zap,
}

function SummaryCard({
  label,
  value,
  subtitle,
  icon,
  color,
  bgColor,
}: {
  label: string
  value: string
  subtitle?: string
  icon: React.ReactNode
  color: string
  bgColor: string
}) {
  return (
    <Card className="rounded-xl">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className={`rounded-lg p-1.5 ${bgColor} ${color}`}>{icon}</div>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className="text-xl font-bold">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}

export function AnalyticsDashboard() {
  const {
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
  } = useAnalyticsDashboard()

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="sr-only" ref={printRef} aria-hidden>
        <h1>LifeOS Analytics Report</h1>
        <p>Generated {format(new Date(), 'PPpp')}</p>
        <div className="card">
          <h2>Summary</h2>
          <p>Productivity Score: {productivityScore}/100</p>
          <p>Level: {level} ({levelTitle}) | XP: {xpTotal}</p>
          <p>Tasks: {opportunitiesCompleted} | Deep work: {deepWorkMinutes} min | Streak: {streakDays} days</p>
          <p>Journal entries: {dailyLogs.length} | Habits: {habits.length} | Goals: {goals.length}</p>
        </div>
        <div className="card">
          <h2>AI Insights</h2>
          {allInsights.map((insight, i) => (
            <p key={i}>[{insight.type}] {insight.title}: {insight.body}</p>
          ))}
        </div>
        <div className="card">
          <h2>Domains</h2>
          {domains.map(d => (
            <p key={d.id}>{d.name}: {opportunities.filter(o => o.domain_id === d.id).length} opportunities</p>
          ))}
        </div>
      </div>

      <PageHeader
        icon={<BarChart3 className="h-6 w-6 text-primary" />}
        title="Analytics Dashboard"
        description="Track your progress, performance, and AI-powered insights"
        variant="compact"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
              <FileText className="h-4 w-4" /> Print / PDF
            </Button>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
        <SummaryCard label="Productivity" value={`${productivityScore}/100`} icon={<Sparkles className="h-4 w-4" />} color="text-primary" bgColor="bg-primary/10" />
        <SummaryCard label="Level" value={`${level}`} subtitle={levelTitle} icon={<Star className="h-4 w-4" />} color="text-amber-400" bgColor="bg-amber-500/10" />
        <SummaryCard label="Tasks Done" value={`${opportunitiesCompleted}`} icon={<Target className="h-4 w-4" />} color="text-green-400" bgColor="bg-green-500/10" />
        <SummaryCard label="Deep Work" value={`${Math.floor(deepWorkMinutes / 60)}h${deepWorkMinutes % 60 > 0 ? `${deepWorkMinutes % 60}m` : ''}`} icon={<Brain className="h-4 w-4" />} color="text-purple-400" bgColor="bg-purple-500/10" />
        <SummaryCard label="Streak" value={`${streakDays}d`} icon={<Flame className="h-4 w-4" />} color="text-orange-400" bgColor="bg-orange-500/10" />
        <SummaryCard label="Total XP" value={xpTotal.toLocaleString()} icon={<Zap className="h-4 w-4" />} color="text-blue-400" bgColor="bg-blue-500/10" />
      </div>

      <Tabs value={dashboardTab} onValueChange={setDashboardTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8 space-y-6">
              <WeeklyScorecard opportunities={isLoading ? undefined : opportunities} domains={isLoading ? undefined : domains} />
              <Charts weeklyData={weeklyChartData} domainData={domainChartData} dailyData={dailyData} statusData={statusData} typeData={typeData} />
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

              {allInsights.length > 0 && (
                <Card className="rounded-xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Sparkles className="h-5 w-5 text-primary" /> Quick Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {allInsights.slice(0, 4).map((insight, i) => (
                      <div key={i} className={`flex items-start gap-2 rounded-lg p-2 text-xs ${
                        insight.type === 'positive' ? 'bg-green-500/10' :
                        insight.type === 'warning' ? 'bg-amber-500/10' :
                        insight.type === 'prediction' ? 'bg-blue-500/10' : 'bg-muted/50'
                      }`}>
                        {insight.type === 'positive' && <TrendingUp className="h-3 w-3 shrink-0 mt-0.5 text-green-500" />}
                        {insight.type === 'warning' && <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5 text-amber-500" />}
                        {insight.type === 'prediction' && <Sparkles className="h-3 w-3 shrink-0 mt-0.5 text-blue-500" />}
                        {insight.type === 'suggestion' && <Lightbulb className="h-3 w-3 shrink-0 mt-0.5 text-muted-foreground" />}
                        <div>
                          <p className="font-medium">{insight.title}</p>
                          <p className="text-muted-foreground">{insight.body}</p>
                        </div>
                      </div>
                    ))}
                    {allInsights.length > 4 && (
                      <button onClick={() => setDashboardTab('insights')} className="flex w-full items-center justify-center gap-1 rounded-lg p-2 text-xs text-muted-foreground hover:bg-muted/50 transition-colors">
                        View all {allInsights.length} insights <ChevronRight className="h-3 w-3" />
                      </button>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card className="rounded-xl">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <span className="flex items-center gap-2"><Trophy className="h-5 w-5 text-purple-400" />Achievements</span>
                    <Badge variant="secondary">{achievements.length}/{allAchievements.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {allAchievements.map((def) => {
                    const isUnlocked = unlockedNames.has(def.name)
                    const IconComponent = ACHIEVEMENT_ICONS[def.icon] || Trophy
                    return (
                      <div key={def.name} className={`flex items-center gap-3 rounded-lg p-2 transition-colors ${
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
        </TabsContent>

        <TabsContent value="insights">
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8 space-y-6">
              <Card className="rounded-xl">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Sparkles className="h-5 w-5 text-primary" /> AI-Powered Insights
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Automatic analysis of your productivity patterns and trends</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {allInsights.length > 0 ? allInsights.map((insight, i) => (
                    <div key={i} className={`flex gap-3 rounded-lg p-3 text-sm ${
                      insight.type === 'positive' ? 'bg-green-500/10 border border-green-500/20' :
                      insight.type === 'warning' ? 'bg-amber-500/10 border border-amber-500/20' :
                      insight.type === 'prediction' ? 'bg-blue-500/10 border border-blue-500/20' :
                      'bg-muted/50 border border-border'
                    }`}>
                      {insight.type === 'positive' && <TrendingUp className="h-4 w-4 shrink-0 text-green-500" />}
                      {insight.type === 'warning' && <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />}
                      {insight.type === 'prediction' && <Sparkles className="h-4 w-4 shrink-0 text-blue-500" />}
                      {insight.type === 'suggestion' && <Lightbulb className="h-4 w-4 shrink-0 text-muted-foreground" />}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{insight.title}</p>
                          {insight.category && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{insight.category}</Badge>}
                        </div>
                        <p className="text-muted-foreground">{insight.body}</p>
                      </div>
                      {insight.priority && <span className="text-xs text-muted-foreground shrink-0">P{insight.priority}</span>}
                    </div>
                  )) : (
                    <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
                      No insights available yet. Start logging activities!
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-xl">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="h-5 w-5 text-emerald-400" /> Predictions & Trends
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-sm text-muted-foreground">{prediction.message}</p>
                    <Badge variant={prediction.trend === 'up' ? 'default' : prediction.trend === 'down' ? 'destructive' : 'secondary'} className="mt-2">
                      {prediction.trend === 'up' ? 'Trending up' : prediction.trend === 'down' ? 'Trending down' : 'Stable'} ({prediction.changePercent > 0 ? '+' : ''}{prediction.changePercent}%)
                    </Badge>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground mb-1">Next period estimate</p>
                      <p className="text-2xl font-bold">{prediction.nextPeriodEstimate}</p>
                      <p className="text-xs text-muted-foreground">tasks</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground mb-1">Current velocity</p>
                      <p className="text-2xl font-bold">{opportunitiesCompleted}</p>
                      <p className="text-xs text-muted-foreground">tasks completed total</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <Card className="rounded-xl">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Heart className="h-5 w-5 text-pink-400" /> Wellbeing
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {dailyLogs.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Journal entries</span>
                        <span className="font-medium">{dailyLogs.length}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Avg energy</span>
                        <span className="font-medium">
                          {(dailyLogs.reduce((sum, l) => sum + l.energy_level, 0) / dailyLogs.length).toFixed(1)}/10
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Recent mood</span>
                        <span className="font-medium capitalize">{dailyLogs[0]?.mood || 'N/A'}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No journal entries yet.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-xl">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Target className="h-5 w-5 text-blue-400" /> Goals & Habits
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Active goals</span>
                    <span className="font-medium">{goals.filter(g => g.progress < 100).length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Completed goals</span>
                    <span className="font-medium">{goals.filter(g => g.progress >= 100).length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Active habits</span>
                    <span className="font-medium">{habits.length}</span>
                  </div>
                  {goals.filter(g => g.progress < 100).slice(0, 3).map(goal => (
                    <div key={goal.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="truncate">{goal.title}</span>
                        <span className="text-muted-foreground">{goal.progress}%</span>
                      </div>
                      <Progress value={goal.progress} className="h-1.5" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="details">
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8 space-y-6">
              <Card className="rounded-xl">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Target className="h-5 w-5 text-blue-400" /> KPIs & Goals
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Custom KPIs vs current values</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {DEFAULT_KPIS.map(kpi => {
                    const value = kpiValues[kpi.id as keyof typeof kpiValues] ?? 0
                    const target = kpi.target ?? 0
                    const pct = target > 0 ? Math.min(Math.round((Number(value) / target) * 100), 100) : 0
                    return (
                      <div key={kpi.id} className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">{kpi.name}</span>
                          <span className="text-sm text-muted-foreground">{value} {kpi.unit}{target > 0 && ` / ${target} ${kpi.unit}`}</span>
                        </div>
                        {target > 0 && (
                          <div className="flex items-center gap-2">
                            <Progress value={pct} className="h-2 flex-1" />
                            <span className="text-xs text-muted-foreground w-10 text-right">{pct}%</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </CardContent>
              </Card>

              {hasTargets && (
                <Card className="rounded-xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Target className="h-5 w-5 text-green-400" /> Weekly Goals Progress
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">Tasks completed this week vs your goals</p>
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
                              <Badge variant={oppPercent >= 100 ? 'default' : 'secondary'} className="text-xs">{completed}/{oppTarget} tasks</Badge>
                              {target.hours_target > 0 && <Badge variant="outline" className="text-xs">{target.hours_target}h goal</Badge>}
                            </div>
                            {oppTarget > 0 && <Progress value={oppPercent} className="h-2" />}
                          </div>
                        )
                      })}
                  </CardContent>
                </Card>
              )}

              <Card className="rounded-xl">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BarChart3 className="h-5 w-5 text-primary" /> Domain Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {domains.map(domain => {
                      const total = opportunities.filter(o => o.domain_id === domain.id).length
                      const done = opportunities.filter(o => o.domain_id === domain.id && o.status === 'done').length
                      const doing = opportunities.filter(o => o.domain_id === domain.id && o.status === 'doing').length
                      const pct = opportunities.length > 0 ? Math.round((total / opportunities.length) * 100) : 0
                      return (
                        <div key={domain.id} className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: domain.color_theme }} />
                            <span className="text-sm font-medium flex-1">{domain.name}</span>
                            <span className="text-xs text-muted-foreground">{total} total | {done} done | {doing} active</span>
                            <Badge variant="outline" className="text-xs">{pct}%</Badge>
                          </div>
                          <Progress value={pct} className="h-1.5" />
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <Card className="rounded-xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Status Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {['backlog', 'doing', 'review', 'done'].map(status => {
                    const count = opportunities.filter(o => o.status === status).length
                    return (
                      <div key={status} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] }} />
                          <span className="text-sm capitalize">{status}</span>
                        </div>
                        <span className="text-sm font-medium">{count}</span>
                      </div>
                    )
                  })}
                  <div className="mt-2 pt-2 border-t flex items-center justify-between">
                    <span className="text-sm font-medium">Total</span>
                    <span className="text-sm font-bold">{opportunities.length}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-xl">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Clock className="h-5 w-5 text-muted-foreground" /> Quick Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Domains</span>
                    <span className="font-medium">{domains.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Opportunities</span>
                    <span className="font-medium">{opportunities.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Completion rate</span>
                    <span className="font-medium">
                      {opportunities.length > 0 ? Math.round((opportunities.filter(o => o.status === 'done').length / opportunities.length) * 100) : 0}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Avg priority</span>
                    <span className="font-medium">
                      {opportunities.length > 0 ? (opportunities.reduce((sum, o) => sum + o.priority, 0) / opportunities.length).toFixed(1) : 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Avg strategic value</span>
                    <span className="font-medium">
                      {opportunities.length > 0 ? (opportunities.reduce((sum, o) => sum + o.strategic_value, 0) / opportunities.length).toFixed(1) : 0}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
