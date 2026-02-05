import { useMemo } from 'react'
import type { Opportunity, LifeDomain } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PieChart as PieChartIcon } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface EnergyBalanceProps {
  opportunities: Opportunity[] | undefined
  domains: LifeDomain[] | undefined
}

interface DomainSlice {
  name: string
  value: number
  color: string
}

export function EnergyBalance({ opportunities, domains }: EnergyBalanceProps) {
  const chartData = useMemo<DomainSlice[] | undefined>(() => {
    if (!opportunities || !domains) return undefined

    const domainMap = new Map(domains.map((d) => [d.id, d]))
    const counts = new Map<string, number>()

    for (const opp of opportunities) {
      if (!opp.domain_id) continue
      counts.set(opp.domain_id, (counts.get(opp.domain_id) ?? 0) + 1)
    }

    const slices: DomainSlice[] = []
    for (const [domainId, count] of counts) {
      const domain = domainMap.get(domainId)
      if (domain) {
        slices.push({
          name: domain.name,
          value: count,
          color: domain.color_theme,
        })
      }
    }

    return slices
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
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <PieChartIcon className="h-5 w-5 text-primary" />
          Energy Balance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={75}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                  fontSize: '0.75rem',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
            </PieChart>
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
              <span className="text-xs font-semibold">{entry.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
