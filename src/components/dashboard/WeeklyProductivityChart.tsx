import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp } from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { useLocalData } from '@/hooks/useLocalData'
import { format, subDays, startOfWeek, addDays, parseISO } from 'date-fns'

export function WeeklyProductivityChart() {
  const { opportunities } = useLocalData()

  const data = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const today = new Date()

    return days.map((day, i) => {
      const date = addDays(weekStart, i)
      const dateStr = format(date, 'yyyy-MM-dd')
      const isPast = date <= today

      if (!isPast) return { day, tasks: 0, xp: 0 }

      // Count tasks completed on this date (done status, created on this day)
      const dayTasks = opportunities.filter(o => {
        if (o.status !== 'done') return false
        try {
          return format(parseISO(o.created_at), 'yyyy-MM-dd') === dateStr
        } catch { return false }
      }).length

      // Estimate XP from tasks (strategic_value based)
      const dayXP = opportunities.filter(o => {
        if (o.status !== 'done') return false
        try {
          return format(parseISO(o.created_at), 'yyyy-MM-dd') === dateStr
        } catch { return false }
      }).reduce((sum, o) => {
        const sv = o.strategic_value ?? 5
        return sum + (sv * 30) // approximate XP
      }, 0)

      return { day, tasks: dayTasks, xp: dayXP }
    })
  }, [opportunities])

  const totalTasks = data.reduce((s, d) => s + d.tasks, 0)
  const totalXP = data.reduce((s, d) => s + d.xp, 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
    >
      <Card className="rounded-xl overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" />
              Weekly Productivity
            </CardTitle>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>
                <span className="font-semibold text-foreground">{totalTasks}</span> tasks
              </span>
              <span>
                <span className="font-semibold text-foreground">{totalXP}</span> XP
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradTasks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradXP" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                    fontSize: '0.75rem',
                    boxShadow: '0 8px 30px -6px hsl(var(--primary) / 0.15)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="tasks"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#gradTasks)"
                  name="Tasks"
                  animationDuration={1200}
                />
                <Area
                  type="monotone"
                  dataKey="xp"
                  stroke="hsl(var(--accent))"
                  strokeWidth={2}
                  fill="url(#gradXP)"
                  name="XP"
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 flex items-center justify-center gap-5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Tasks Done
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-accent" />
              XP Earned
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
