import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useXPSystem } from '@/hooks/useXPSystem'
import { SCORECARD_THRESHOLDS, GAMIFICATION_CONFIG } from '@/lib/constants'
import type { Opportunity, LifeDomain } from '@/types'
import { cn } from '@/lib/utils'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Brain,
  Flame,
  BarChart3,
  Trophy,
  Zap,
} from 'lucide-react'
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'

interface WeeklyScorecardProps {
  opportunities?: Opportunity[]
  domains?: LifeDomain[]
  className?: string
}

interface KPICardProps {
  label: string
  value: string | number
  target?: string | number
  trend?: 'up' | 'down' | 'neutral'
  icon: typeof Target
  color: string
}

function KPICard({ label, value, target, trend, icon: Icon, color }: KPICardProps) {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <div className="flex items-start justify-between">
        <div className={cn('rounded-lg p-2', color)}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        {trend && (
          <div className={cn(
            'flex items-center gap-0.5 text-xs font-medium',
            trend === 'up' && 'text-green-400',
            trend === 'down' && 'text-red-400',
            trend === 'neutral' && 'text-muted-foreground'
          )}>
            {trend === 'up' && <TrendingUp className="h-3 w-3" />}
            {trend === 'down' && <TrendingDown className="h-3 w-3" />}
            {trend === 'neutral' && <Minus className="h-3 w-3" />}
          </div>
        )}
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {target && (
        <p className="mt-1 text-xs text-muted-foreground">
          Target: {target}
        </p>
      )}
    </div>
  )
}

export function WeeklyScorecard({ opportunities, domains, className }: WeeklyScorecardProps) {
  const {
    xpTotal,
    streakDays,
    deepWorkMinutes,
    opportunitiesCompleted,
    level,
    weekScore,
    setWeekScore,
  } = useXPSystem()

  // Calculate domain balance
  const domainData = useMemo(() => {
    if (!opportunities || !domains) return []

    const domainCounts: Record<string, number> = {}
    const total = opportunities.length

    opportunities.forEach(opp => {
      if (opp.domain_id) {
        domainCounts[opp.domain_id] = (domainCounts[opp.domain_id] || 0) + 1
      }
    })

    return domains.map(domain => ({
      name: domain.name,
      value: total > 0 ? Math.round((domainCounts[domain.id] || 0) / total * 100) : 0,
      fullMark: 100,
    }))
  }, [opportunities, domains])

  // Mock weekly XP trend data
  const weeklyTrend = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    return days.map((day, i) => ({
      day,
      xp: Math.floor(Math.random() * 150) + 50 + (i === 6 ? xpTotal % 200 : 0),
    }))
  }, [xpTotal])

  // Calculate overall score
  const calculatedScore = useMemo(() => {
    let score = 0

    // XP component (30%)
    const weeklyXpTarget = SCORECARD_THRESHOLDS.XP_GOAL_DAILY * 7
    const xpScore = Math.min(xpTotal / weeklyXpTarget, 1) * 30

    // Opportunities component (25%)
    const oppScore = Math.min(opportunitiesCompleted / SCORECARD_THRESHOLDS.OPPORTUNITIES_GOAL_WEEKLY, 1) * 25

    // Deep work component (25%)
    const deepWorkHours = deepWorkMinutes / 60
    const deepWorkScore = Math.min(deepWorkHours / SCORECARD_THRESHOLDS.DEEP_WORK_GOAL_WEEKLY, 1) * 25

    // Streak component (20%)
    const streakScore = Math.min(streakDays / 7, 1) * 20

    score = Math.round(xpScore + oppScore + deepWorkScore + streakScore)

    return score
  }, [xpTotal, opportunitiesCompleted, deepWorkMinutes, streakDays])

  const deepWorkHours = Math.floor(deepWorkMinutes / 60)
  const deepWorkMins = deepWorkMinutes % 60

  return (
    <Card className={cn('rounded-xl', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-primary" />
            Weekly Scorecard
          </CardTitle>
          <Badge
            variant="secondary"
            className={cn(
              'gap-1 text-lg font-bold',
              calculatedScore >= 80 && 'bg-green-500/20 text-green-400',
              calculatedScore >= 50 && calculatedScore < 80 && 'bg-yellow-500/20 text-yellow-400',
              calculatedScore < 50 && 'bg-red-500/20 text-red-400'
            )}
          >
            <Trophy className="h-4 w-4" />
            {calculatedScore}/100
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KPICard
            label="XP Gained"
            value={xpTotal.toLocaleString()}
            target={`${SCORECARD_THRESHOLDS.XP_GOAL_DAILY * 7}`}
            trend={xpTotal > 500 ? 'up' : 'neutral'}
            icon={Zap}
            color="bg-amber-500"
          />
          <KPICard
            label="Completed"
            value={opportunitiesCompleted}
            target={`${SCORECARD_THRESHOLDS.OPPORTUNITIES_GOAL_WEEKLY}+`}
            trend={opportunitiesCompleted >= 5 ? 'up' : 'down'}
            icon={Target}
            color="bg-green-500"
          />
          <KPICard
            label="Deep Work"
            value={`${deepWorkHours}h${deepWorkMins > 0 ? ` ${deepWorkMins}m` : ''}`}
            target={`${SCORECARD_THRESHOLDS.DEEP_WORK_GOAL_WEEKLY}h`}
            trend={deepWorkHours >= 10 ? 'up' : 'neutral'}
            icon={Brain}
            color="bg-purple-500"
          />
          <KPICard
            label="Streak"
            value={`${streakDays} days`}
            target="7+ days"
            trend={streakDays >= 7 ? 'up' : streakDays > 0 ? 'neutral' : 'down'}
            icon={Flame}
            color="bg-orange-500"
          />
        </div>

        {/* Charts Row */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* XP Trend */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">XP Trend</p>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyTrend}>
                  <defs>
                    <linearGradient id="xpGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="xp"
                    stroke="#f59e0b"
                    fillOpacity={1}
                    fill="url(#xpGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Domain Balance Radar */}
          {domainData.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Domain Balance</p>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={domainData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Radar
                      name="Balance"
                      dataKey="value"
                      stroke="#8b5cf6"
                      fill="#8b5cf6"
                      fillOpacity={0.3}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Insights */}
        <div className="space-y-2 rounded-lg bg-muted/50 p-3">
          <p className="text-sm font-medium">AI Insights</p>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {streakDays >= 7 && (
              <li className="flex items-center gap-1">
                <span className="text-green-400">+</span> Great streak! Keep the momentum going.
              </li>
            )}
            {deepWorkHours < 5 && (
              <li className="flex items-center gap-1">
                <span className="text-yellow-400">!</span> Consider scheduling more deep work sessions.
              </li>
            )}
            {opportunitiesCompleted >= 5 && (
              <li className="flex items-center gap-1">
                <span className="text-green-400">+</span> Excellent completion rate this week!
              </li>
            )}
            {domainData.some(d => d.value > SCORECARD_THRESHOLDS.DOMAIN_BALANCE_MAX) && (
              <li className="flex items-center gap-1">
                <span className="text-yellow-400">!</span> One domain is dominating - consider rebalancing.
              </li>
            )}
            <li className="flex items-center gap-1">
              <span className="text-blue-400">i</span> Level {level} - {GAMIFICATION_CONFIG.XP_PER_LEVEL(level) - xpTotal % GAMIFICATION_CONFIG.XP_PER_LEVEL(level)} XP to next level.
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
