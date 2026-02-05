import { useMemo } from 'react'
import type { Opportunity, LifeDomain } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Radar } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface OpportunityRadarProps {
  opportunities: Opportunity[] | undefined
  domains: LifeDomain[] | undefined
}

export function OpportunityRadar({ opportunities, domains }: OpportunityRadarProps) {
  const forgottenItems = useMemo(() => {
    if (!opportunities) return undefined
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    return opportunities
      .filter((o) => {
        if (o.status !== 'backlog') return false
        if (o.priority < 3) return false
        const created = new Date(o.created_at)
        return created < sevenDaysAgo
      })
      .sort((a, b) => {
        const scoreA = a.priority * (a.strategic_value ?? 0)
        const scoreB = b.priority * (b.strategic_value ?? 0)
        return scoreB - scoreA
      })
      .slice(0, 5)
  }, [opportunities])

  const domainMap = useMemo(() => {
    if (!domains) return new Map<string, LifeDomain>()
    return new Map(domains.map((d) => [d.id, d]))
  }, [domains])

  // Loading state
  if (forgottenItems === undefined) {
    return (
      <Card className="rounded-xl">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Radar className="h-5 w-5 text-primary" />
          Forgotten Radar
        </CardTitle>
      </CardHeader>
      <CardContent>
        {forgottenItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No forgotten high-priority items. You are on top of things.
          </p>
        ) : (
          <ul className="space-y-3">
            {forgottenItems.map((item) => {
              const domain = item.domain_id ? domainMap.get(item.domain_id) : null
              const timeAgo = formatDistanceToNow(new Date(item.created_at), {
                addSuffix: true,
              })

              return (
                <li key={item.id} className="flex items-start gap-3">
                  <span
                    className="mt-1.5 inline-block h-2.5 w-2.5 shrink-0 animate-pulse rounded-full"
                    style={{
                      backgroundColor: domain?.color_theme ?? '#6b7280',
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{timeAgo}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
