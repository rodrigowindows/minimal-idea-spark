import { useMemo, useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ComposedChart,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { BarChart3, PieChart as PieChartIcon, TrendingUp, Activity } from 'lucide-react'

interface DataPoint {
  name: string
  value: number
  fill?: string
}

interface DailyPoint {
  date: string
  tasks: number
  logs: number
  mood: number
}

interface ChartsProps {
  weeklyData?: { day: string; xp: number; tasks: number }[]
  domainData?: DataPoint[]
  dailyData?: DailyPoint[]
  statusData?: { name: string; value: number; fill: string }[]
  typeData?: { name: string; value: number; fill: string }[]
}

const CHART_COLORS = ['#8b5cf6', '#22c55e', '#f59e0b', '#3b82f6', '#ec4899', '#06b6d4', '#f97316', '#14b8a6']

const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
}

export function Charts({
  weeklyData = [],
  domainData = [],
  dailyData = [],
  statusData = [],
  typeData = [],
}: ChartsProps) {
  const [activeTab, setActiveTab] = useState('overview')

  const areaData = useMemo(() => {
    if (weeklyData.length) return weeklyData
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => ({
      day,
      xp: Math.floor(Math.random() * 80) + 20,
      tasks: Math.floor(Math.random() * 4) + 1,
    }))
  }, [weeklyData])

  const moodTrend = useMemo(() => {
    if (!dailyData.length) return []
    return dailyData
      .filter(d => d.mood > 0)
      .map(d => ({
        date: d.date.slice(5), // MM-DD
        mood: d.mood,
        tasks: d.tasks,
      }))
  }, [dailyData])

  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-primary" />
            Charts & Visualizations
          </CardTitle>
          <Badge variant="secondary" className="text-xs">{dailyData.length} data points</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="gap-1 text-xs">
              <Activity className="h-3 w-3" /> Overview
            </TabsTrigger>
            <TabsTrigger value="domains" className="gap-1 text-xs">
              <PieChartIcon className="h-3 w-3" /> Domains
            </TabsTrigger>
            <TabsTrigger value="trends" className="gap-1 text-xs">
              <TrendingUp className="h-3 w-3" /> Trends
            </TabsTrigger>
            <TabsTrigger value="mood" className="gap-1 text-xs">
              <BarChart3 className="h-3 w-3" /> Mood
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-4 md:grid-cols-2">
              {/* XP & Tasks Combo Chart */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">XP & Tasks this week</p>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={areaData}>
                      <defs>
                        <linearGradient id="xpGradCharts" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Area yAxisId="left" type="monotone" dataKey="xp" stroke="hsl(var(--primary))" fill="url(#xpGradCharts)" name="XP" />
                      <Bar yAxisId="right" dataKey="tasks" fill="#22c55e" opacity={0.7} radius={[4, 4, 0, 0]} name="Tasks" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Status Distribution */}
              {statusData.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Task status distribution</p>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {statusData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill || CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="domains">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Domain Bar Chart */}
              {domainData.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Opportunities by domain</p>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={domainData} layout="vertical" margin={{ left: 0, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                          {domainData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill || CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Domain Radar */}
              {domainData.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Domain balance</p>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={domainData.map(d => ({ ...d, fullMark: Math.max(...domainData.map(x => x.value), 1) }))}>
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                        <Radar name="Balance" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Type Distribution Pie */}
              {typeData.length > 0 && (
                <div className="space-y-2 md:col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">By type (Action, Study, Insight, Networking)</p>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={typeData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                        >
                          {typeData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill || CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="trends">
            <div className="space-y-4">
              {/* Daily Activity Line */}
              {dailyData.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Daily activity (last 30 days)</p>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dailyData.map(d => ({ ...d, date: d.date.slice(5) }))}>
                        <defs>
                          <linearGradient id="taskGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={4} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        <Area type="monotone" dataKey="tasks" stroke="#22c55e" fill="url(#taskGrad)" name="Tasks" />
                        <Area type="monotone" dataKey="logs" stroke="#3b82f6" fill="none" strokeDasharray="4 4" name="Journal" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="mood">
            <div className="space-y-4">
              {moodTrend.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Mood trend (1=terrible → 5=great)</p>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={moodTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={2} />
                        <YAxis domain={[0, 5]} tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        <Line type="monotone" dataKey="mood" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Mood" />
                        <Line type="monotone" dataKey="tasks" stroke="#22c55e" strokeDasharray="4 4" dot={false} name="Tasks" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                  No mood data available. Log journal entries with mood to see trends.
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
