import { useMemo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMockData } from '@/hooks/useMockData'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { STATUS_COLORS, OPPORTUNITY_STATUSES, calculateXPReward } from '@/lib/constants'
import type { OpportunityStatus } from '@/lib/constants'
import type { Opportunity } from '@/types'
import { useXPSystem } from '@/hooks/useXPSystem'
import { useAppContext } from '@/contexts/AppContext'
import { Target, Search, Star, Plus, Zap, ChevronRight, CheckCircle2, Archive } from 'lucide-react'
import { toast } from 'sonner'

export function Opportunities() {
  const { opportunities, domains, isLoading } = useMockData()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<OpportunityStatus | 'All'>('All')
  const { addXP, awardTaskComplete } = useXPSystem()
  const { setCurrentOpportunity, toggleDeepWorkMode } = useAppContext()

  const domainMap = useMemo(() => {
    if (!domains) return new Map()
    return new Map(domains.map((d) => [d.id, d]))
  }, [domains])

  const filteredOpportunities = useMemo(() => {
    if (!opportunities) return []
    return opportunities.filter((opp) => {
      const matchesSearch = searchQuery === '' ||
        opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opp.description?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = selectedStatus === 'All' ||
        opp.status.toLowerCase() === selectedStatus.toLowerCase()
      return matchesSearch && matchesStatus
    })
  }, [opportunities, searchQuery, selectedStatus])

  const statusCounts = useMemo(() => {
    if (!opportunities) return {}
    const counts: Record<string, number> = { All: opportunities.length }
    for (const status of OPPORTUNITY_STATUSES) {
      counts[status] = opportunities.filter((o) => o.status.toLowerCase() === status.toLowerCase()).length
    }
    return counts
  }, [opportunities])

  const handleComplete = useCallback((opp: Opportunity) => {
    const xp = calculateXPReward(opp.type, opp.strategic_value ?? 5)
    addXP(xp)
    awardTaskComplete()
    toast.success(
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-green-400" />
        <span>Completed!</span>
        <Badge variant="secondary" className="gap-1 bg-amber-500/20 text-amber-400">
          <Zap className="h-3 w-3" />+{xp} XP
        </Badge>
      </div>
    )
  }, [addXP, awardTaskComplete])

  const handleFocus = useCallback((opp: Opportunity) => {
    setCurrentOpportunity(opp)
    toggleDeepWorkMode()
  }, [setCurrentOpportunity, toggleDeepWorkMode])

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Opportunities</h1>
          </div>
          <Button className="gap-2"><Plus className="h-4 w-4" />New</Button>
        </div>
      </header>

      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search opportunities..." className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setSelectedStatus('All')}
            className={cn('rounded-full px-3 py-1 text-sm font-medium transition-colors',
              selectedStatus === 'All' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80')}>
            All ({statusCounts['All'] ?? 0})
          </button>
          {OPPORTUNITY_STATUSES.map((status) => (
            <button key={status} onClick={() => setSelectedStatus(status)}
              className={cn('rounded-full px-3 py-1 text-sm font-medium transition-colors',
                selectedStatus === status ? 'text-white' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80')}
              style={selectedStatus === status ? { backgroundColor: STATUS_COLORS[status] } : undefined}>
              {status} ({statusCounts[status] ?? 0})
            </button>
          ))}
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-280px)]">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="rounded-xl">
                <CardContent className="flex items-center gap-4 py-4">
                  <Skeleton className="h-3 w-3 rounded-full" />
                  <div className="flex-1 space-y-2"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" /></div>
                  <Skeleton className="h-6 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredOpportunities.length === 0 ? (
          <Card className="rounded-xl">
            <CardContent className="py-12 text-center">
              <Target className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                {searchQuery || selectedStatus !== 'All' ? 'No opportunities match your filters.' : 'No opportunities yet.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredOpportunities.map((opp) => {
                const domain = opp.domain_id ? domainMap.get(opp.domain_id) : null
                const priorityStars = Math.min(Math.max(Math.round(opp.priority / 2), 1), 5)
                const statusKey = (opp.status.charAt(0).toUpperCase() + opp.status.slice(1)) as OpportunityStatus
                const xpReward = calculateXPReward(opp.type, opp.strategic_value ?? 5)

                return (
                  <motion.div key={opp.id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 100 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
                    <Card className="group cursor-pointer rounded-xl transition-colors hover:bg-card/80">
                      <CardContent className="flex items-start gap-4 py-4">
                        <span className="mt-1.5 inline-block h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: domain?.color_theme ?? '#6b7280' }} />
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium">{opp.title}</h3>
                          {opp.description && (
                            <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{opp.description}</p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {domain && (
                              <span className="text-xs font-medium" style={{ color: domain.color_theme }}>{domain.name}</span>
                            )}
                            <Badge variant="secondary" className="text-xs capitalize">{opp.type}</Badge>
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className={cn('h-3 w-3', i < priorityStars ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30')} />
                              ))}
                            </div>
                            <span className="text-[10px] text-amber-400 font-medium">{xpReward} XP</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="hidden gap-1 group-hover:flex">
                            {opp.status !== 'done' && (
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleComplete(opp)}>
                                <CheckCircle2 className="h-4 w-4 text-green-400" />
                              </Button>
                            )}
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleFocus(opp)}>
                              <Zap className="h-4 w-4 text-primary" />
                            </Button>
                          </div>
                          <Badge className="shrink-0 capitalize text-white" style={{ backgroundColor: STATUS_COLORS[statusKey] }}>
                            {opp.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
