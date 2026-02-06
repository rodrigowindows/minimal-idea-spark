import { useMemo } from 'react'
import type { Opportunity, LifeDomain } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PieChart as PieChartIcon, AlertTriangle } from 'lucide-react'
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from 'recharts'
import { SCORECARD_THRESHOLDS } from '@/lib/constants'

interface EnergyBalanceProps {
  opportunities: Opportunity[] | undefined
  domains: LifeDomain[] | undefined
}

export function EnergyBalance({ opportunities, domains }: EnergyBalanceProps) {
  const { chartData, isImbalanced, maxDomain, maxPercent } = useMemo(() => {
    if (!opportunities || !domains)
      return { chartData: undefined, isImbalanced: false, maxDomain: '', maxPercent: 0 }

    const counts = new Map<string, number>()
    const total = opportunities.length || 1

    for (const opp of opportunities) {
      if (!opp.domain_id) continue
      counts.set(opp.domain_id, (counts.get(opp.domain_id) ?? 0) + 1)
    }

    const data = domains.map((domain) => {
      const count = counts.get(domain.id) || 0
      const percent = Math.round((count / total) * 100)
      const target = domain.target_percentage ?? 20
      return {
        name: domain.name,
        actual: percent,
        target,
        count,
        color: domain.color_theme,
        fullMark: 100,
      }
    })

    const max = data.reduce(
      (best, d) => (d.actual > best.actual ? d : best),
      { actual: 0, name: '' } as { actual: number; name: string }
    )

    return {
      chartData: data,
      isImbalanced: max.actual > SCORECARD_THRESHOLDS.BURNOUT_THRESHOLD,
      maxDomain: max.name,
      maxPercent: max.actual,
    }
  }, [opportunities, domains])

  // Loading state
  if (chartData === undefined) {
    return (
      <Card className="rounded-xl">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <Skeleton className="h-40 w-40 rounded-full" />
          <div className="flex gap-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (chartData.length === 0) {
    return (
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <PieChartIcon className="h-5 w-5 text-primary" />
            Energy Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No opportunities to display.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <PieChartIcon className="h-5 w-5 text-primary" />
          Energy Balance
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isImbalanced && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Burnout risk: {maxDomain} at {maxPercent}% of total effort.</span>
          </div>
        )}

        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                  fontSize: '0.75rem',
                }}
                formatter={(value: number, name: string) => [
                  `${value}%`,
                  name === 'actual' ? 'Actual' : 'Target',
                ]}
              />
              <Radar
                name="target"
                dataKey="target"
                stroke="#6b7280"
                fill="#6b7280"
                fillOpacity={0.1}
                strokeDasharray="4 4"
                strokeWidth={1}
              />
              <Radar
                name="actual"
                dataKey="actual"
                stroke="#8b5cf6"
                fill="#8b5cf6"
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
          {chartData.map((entry) => (
            <div key={entry.name} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs text-muted-foreground">
                {entry.name}
              </span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {entry.count}
              </Badge>
            </div>
          ))}
        </div>

        <div className="mt-2 flex items-center justify-center gap-3 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="inline-block h-2 w-4 rounded-sm bg-[#8b5cf6]/30" />
            Actual
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block h-2 w-4 rounded-sm border border-dashed border-muted-foreground/40" />
            Target
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
