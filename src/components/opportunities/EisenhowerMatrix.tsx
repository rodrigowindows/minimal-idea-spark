import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Opportunity } from '@/types'
import { Zap, Clock, Users, Trash2 } from 'lucide-react'

interface EisenhowerMatrixProps {
  opportunities: Opportunity[]
  onSelect?: (opp: Opportunity) => void
}

export function EisenhowerMatrix({ opportunities, onSelect }: EisenhowerMatrixProps) {
  const quadrants = useMemo(() => {
    const active = opportunities.filter(o => o.status !== 'done')

    return {
      do: active.filter(o => o.priority >= 7 && (o.strategic_value ?? 0) >= 7),
      schedule: active.filter(o => o.priority < 7 && (o.strategic_value ?? 0) >= 7),
      delegate: active.filter(o => o.priority >= 7 && (o.strategic_value ?? 0) < 7),
      eliminate: active.filter(o => o.priority < 7 && (o.strategic_value ?? 0) < 7),
    }
  }, [opportunities])

  const quadrantConfig = [
    {
      key: 'do' as const,
      title: 'DO FIRST',
      subtitle: 'Urgent & Important',
      icon: Zap,
      bg: 'bg-red-500/10 border-red-500/30',
      headerBg: 'bg-red-500/20',
      textColor: 'text-red-400',
    },
    {
      key: 'schedule' as const,
      title: 'SCHEDULE',
      subtitle: 'Not Urgent & Important',
      icon: Clock,
      bg: 'bg-blue-500/10 border-blue-500/30',
      headerBg: 'bg-blue-500/20',
      textColor: 'text-blue-400',
    },
    {
      key: 'delegate' as const,
      title: 'DELEGATE',
      subtitle: 'Urgent & Not Important',
      icon: Users,
      bg: 'bg-amber-500/10 border-amber-500/30',
      headerBg: 'bg-amber-500/20',
      textColor: 'text-amber-400',
    },
    {
      key: 'eliminate' as const,
      title: 'ELIMINATE',
      subtitle: 'Not Urgent & Not Important',
      icon: Trash2,
      bg: 'bg-gray-500/10 border-gray-500/30',
      headerBg: 'bg-gray-500/20',
      textColor: 'text-gray-400',
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {quadrantConfig.map((q) => (
        <Card key={q.key} className={cn('rounded-xl border', q.bg)}>
          <CardHeader className={cn('rounded-t-xl pb-2', q.headerBg)}>
            <CardTitle className={cn('flex items-center gap-2 text-sm font-semibold', q.textColor)}>
              <q.icon className="h-4 w-4" />
              {q.title}
              <Badge variant="outline" className="ml-auto text-xs">
                {quadrants[q.key].length}
              </Badge>
            </CardTitle>
            <p className="text-xs text-muted-foreground">{q.subtitle}</p>
          </CardHeader>
          <CardContent className="space-y-2 pt-3">
            {quadrants[q.key].length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">No items</p>
            ) : (
              quadrants[q.key].map((opp) => (
                <motion.button
                  key={opp.id}
                  layout
                  onClick={() => onSelect?.(opp)}
                  className="flex w-full items-center gap-2 rounded-lg bg-card/50 p-2 text-left transition-colors hover:bg-card"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: opp.domain?.color_theme ?? '#6b7280' }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{opp.title}</p>
                    <p className="text-xs text-muted-foreground">
                      P:{opp.priority} SV:{opp.strategic_value ?? '?'}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-[10px] capitalize">
                    {opp.type}
                  </Badge>
                </motion.button>
              ))
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
