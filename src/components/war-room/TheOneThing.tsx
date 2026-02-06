import { useMemo } from 'react'
import type { Opportunity, LifeDomain } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppContext } from '@/contexts/AppContext'
import { Target, Star, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TheOneThingProps {
  opportunities: Opportunity[] | undefined
  domains: LifeDomain[] | undefined
}

export function TheOneThing({ opportunities, domains }: TheOneThingProps) {
  const { setCurrentOpportunity, toggleDeepWorkMode } = useAppContext()

  const topOpportunity = useMemo(() => {
    if (!opportunities) return undefined
    return opportunities
      .filter((o) => o.status === 'doing' || o.status === 'backlog')
      .sort((a, b) => {
        const scoreA = a.priority * (a.strategic_value ?? 0)
        const scoreB = b.priority * (b.strategic_value ?? 0)
        return scoreB - scoreA
      })[0] ?? null
  }, [opportunities])

  const domain = useMemo(() => {
    if (!topOpportunity || !domains) return null
    return domains.find((d) => d.id === topOpportunity.domain_id) ?? null
  }, [topOpportunity, domains])

  const handleFocus = () => {
    if (topOpportunity) {
      setCurrentOpportunity(topOpportunity)
      toggleDeepWorkMode()
    }
  }

  // Loading state
  if (opportunities === undefined || domains === undefined) {
    return (
      <Card className="rounded-xl">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
    )
  }

  // Empty state
  if (!topOpportunity) {
    return (
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-muted-foreground" />
            The One Thing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No active opportunities. Add one to get started.
          </p>
        </CardContent>
      </Card>
    )
  }

  const priorityStars = Math.min(Math.max(Math.round(topOpportunity.priority / 2), 1), 5)
  const strategicValue = topOpportunity.strategic_value ?? 0
  const strategicPercent = Math.min(strategicValue, 100)

  return (
    <div className="rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-[2px]">
      <Card className="rounded-[10px] border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-primary" />
            The One Thing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Title */}
          <h2 className="text-2xl font-bold tracking-tight">
            {topOpportunity.title}
          </h2>

          {/* Domain + Type */}
          <div className="flex flex-wrap items-center gap-2">
            {domain && (
              <span
                className="inline-flex items-center gap-1.5 text-sm font-medium"
                style={{ color: domain.color_theme }}
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: domain.color_theme }}
                />
                {domain.name}
              </span>
            )}
            <Badge variant="secondary" className="capitalize">
              {topOpportunity.type}
            </Badge>
          </div>

          {/* Priority stars */}
          <div className="flex items-center gap-1">
            <span className="mr-1 text-xs font-medium text-muted-foreground">Priority</span>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={cn(
                  'h-4 w-4',
                  i < priorityStars
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-muted-foreground/30'
                )}
              />
            ))}
          </div>

          {/* Strategic value bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Strategic Value
              </span>
              <span className="text-xs font-semibold">{strategicValue}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
                style={{ width: `${strategicPercent}%` }}
              />
            </div>
          </div>

          {/* Focus button */}
          <Button onClick={handleFocus} className="gap-2 min-h-[44px] touch-manipulation">
            <Zap className="h-4 w-4" />
            Focus
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
