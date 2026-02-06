import { useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { OPPORTUNITY_STATUSES, STATUS_COLORS, calculateXPReward } from '@/lib/constants'
import type { OpportunityStatus } from '@/lib/constants'
import type { Opportunity, LifeDomain } from '@/types'
import { Star, Zap, CheckCircle2, Pencil, Focus } from 'lucide-react'

interface KanbanBoardProps {
  opportunities: Opportunity[]
  domainMap: Map<string, LifeDomain>
  onComplete: (opp: Opportunity) => void
  onEdit: (opp: Opportunity) => void
  onFocus: (opp: Opportunity) => void
  onMoveStatus: (id: string, status: Opportunity['status']) => void
}

export function KanbanBoard({ opportunities, domainMap, onComplete, onEdit, onFocus, onMoveStatus }: KanbanBoardProps) {
  const columns = useMemo(() => {
    const result: Record<string, Opportunity[]> = {}
    for (const status of OPPORTUNITY_STATUSES) {
      result[status] = opportunities.filter(o =>
        o.status.toLowerCase() === status.toLowerCase()
      )
    }
    return result
  }, [opportunities])

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {OPPORTUNITY_STATUSES.map((status) => (
        <KanbanColumn
          key={status}
          status={status}
          opportunities={columns[status] || []}
          domainMap={domainMap}
          onComplete={onComplete}
          onEdit={onEdit}
          onFocus={onFocus}
          onMoveStatus={onMoveStatus}
        />
      ))}
    </div>
  )
}

function KanbanColumn({
  status,
  opportunities,
  domainMap,
  onComplete,
  onEdit,
  onFocus,
  onMoveStatus,
}: {
  status: OpportunityStatus
  opportunities: Opportunity[]
  domainMap: Map<string, LifeDomain>
  onComplete: (opp: Opportunity) => void
  onEdit: (opp: Opportunity) => void
  onFocus: (opp: Opportunity) => void
  onMoveStatus: (id: string, status: Opportunity['status']) => void
}) {
  const statusLower = status.toLowerCase() as Opportunity['status']
  const nextStatus = getNextStatus(statusLower)

  return (
    <div className="flex flex-col">
      <div className="mb-3 flex items-center gap-2">
        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] }} />
        <h3 className="text-sm font-semibold">{status}</h3>
        <Badge variant="secondary" className="ml-auto text-xs">{opportunities.length}</Badge>
      </div>

      <ScrollArea className="h-[calc(100vh-280px)]">
        <div className="space-y-2 pr-2">
          <AnimatePresence>
            {opportunities.map((opp) => {
              const domain = opp.domain_id ? domainMap.get(opp.domain_id) : null
              const xpReward = calculateXPReward(opp.type, opp.strategic_value ?? 5)
              const priorityStars = Math.min(Math.max(Math.round(opp.priority / 2), 1), 5)

              return (
                <motion.div
                  key={opp.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Card className="group cursor-pointer rounded-lg transition-colors hover:bg-card/80">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <span
                          className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: domain?.color_theme ?? '#6b7280' }}
                        />
                        <p className="flex-1 text-sm font-medium leading-tight">{opp.title}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-1">
                        {domain && (
                          <span className="text-[10px] font-medium" style={{ color: domain.color_theme }}>
                            {domain.name}
                          </span>
                        )}
                        <Badge variant="secondary" className="text-[10px] capitalize px-1.5 py-0">
                          {opp.type}
                        </Badge>
                        <span className="text-[10px] text-amber-400 font-medium">{xpReward} XP</span>
                      </div>

                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              'h-2.5 w-2.5',
                              i < priorityStars ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'
                            )}
                          />
                        ))}
                      </div>

                      {/* Actions on hover */}
                      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onEdit(opp)}>
                          <Pencil className="h-3 w-3 text-muted-foreground" />
                        </Button>
                        {opp.status !== 'done' && (
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onComplete(opp)}>
                            <CheckCircle2 className="h-3 w-3 text-green-400" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onFocus(opp)}>
                          <Focus className="h-3 w-3 text-primary" />
                        </Button>
                        {nextStatus && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="ml-auto h-6 px-2 text-[10px]"
                            onClick={() => onMoveStatus(opp.id, nextStatus)}
                          >
                            Move &rarr;
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {opportunities.length === 0 && (
            <div className="rounded-lg border border-dashed border-border/50 p-4 text-center">
              <p className="text-xs text-muted-foreground">No items</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

function getNextStatus(current: Opportunity['status']): Opportunity['status'] | null {
  const flow: Opportunity['status'][] = ['backlog', 'doing', 'review', 'done']
  const idx = flow.indexOf(current)
  return idx < flow.length - 1 ? flow[idx + 1] : null
}
