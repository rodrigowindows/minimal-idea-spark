import { useMemo } from 'react'
import type { Opportunity, LifeDomain } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Radar as RadarIcon, AlertTriangle } from 'lucide-react'
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

interface OpportunityRadarProps {
  opportunities: Opportunity[] | undefined
  domains: LifeDomain[] | undefined
}

export function OpportunityRadar({ opportunities, domains }: OpportunityRadarProps) {
  const { radarData, isImbalanced, maxPercent } = useMemo(() => {
    if (!opportunities || !domains) return { radarData: undefined, isImbalanced: false, maxPercent: 0 }

    const counts = new Map<string, number>()
    const total = opportunities.length || 1

    for (const opp of opportunities) {
      if (!opp.domain_id) continue
      counts.set(opp.domain_id, (counts.get(opp.domain_id) ?? 0) + 1)
    }

    const data = domains.map(domain => {
      const count = counts.get(domain.id) || 0
      const percent = Math.round((count / total) * 100)
      return {
        name: domain.name,
        value: percent,
        count,
        fullMark: 100,
      }
    })

    const max = Math.max(...data.map(d => d.value), 0)
    return {
      radarData: data,
      isImbalanced: max > SCORECARD_THRESHOLDS.BURNOUT_THRESHOLD,
      maxPercent: max,
    }
  }, [opportunities, domains])

  if (radarData === undefined) {
    return (
      <Card className="rounded-xl">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <RadarIcon className="h-5 w-5 text-primary" />
          Balance Radar
        </CardTitle>
      </CardHeader>
      <CardContent>
        {radarData.length === 0 ? (
          <p className="text-sm text-muted-foreground">No domain data yet.</p>
        ) : (
          <>
            {isImbalanced && (
              <div className="mb-3 flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Burnout risk: one domain at {maxPercent}% of effort.</span>
              </div>
            )}

            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
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
                    formatter={(value: number) => [`${value}%`, 'Effort']}
                  />
                  <Radar
                    name="Effort"
                    dataKey="value"
                    stroke="#8b5cf6"
                    fill="#8b5cf6"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1">
              {radarData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">{entry.name}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {entry.count}
                  </Badge>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
