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

function generateWeekData() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const today = new Date().getDay() // 0=Sun, 1=Mon...
  const adjustedToday = today === 0 ? 6 : today - 1 // 0=Mon

  return days.map((day, i) => {
    const isPast = i <= adjustedToday
    const tasks = isPast ? Math.floor(Math.random() * 6) + 1 : 0
    const focus = isPast ? Math.round(Math.random() * 3 * 10) / 10 : 0
    const xp = isPast ? tasks * 15 + Math.floor(Math.random() * 30) : 0
    return { day, tasks, focus, xp }
  })
}

export function WeeklyProductivityChart() {
  const data = useMemo(() => generateWeekData(), [])

  const totalTasks = data.reduce((s, d) => s + d.tasks, 0)
  const totalFocus = data.reduce((s, d) => s + d.focus, 0)

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
                <span className="font-semibold text-foreground">{totalFocus.toFixed(1)}</span>h focus
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

          {/* Legend */}
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
