import { useMemo, useState, useCallback, useEffect, memo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useMotionValue, useTransform, type PanInfo } from 'framer-motion'
import { useLocalData } from '@/hooks/useLocalData'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { STATUS_COLORS, OPPORTUNITY_STATUSES, calculateXPReward } from '@/lib/constants'
import type { OpportunityStatus } from '@/lib/constants'
import type { Opportunity, LifeDomain } from '@/types'
import { useXPSystem } from '@/hooks/useXPSystem'
import { useAppContext } from '@/contexts/AppContext'
import { OpportunityDialog } from '@/components/opportunities/OpportunityDialog'
import { EmptyState } from '@/components/EmptyState'
import { VirtualList } from '@/components/VirtualList'
import { TagFilter } from '@/components/tags/TagFilter'
import { TagBadge } from '@/components/tags/TagBadge'
import { getTagsForOpportunity, setTagsForOpportunity, getAllTags } from '@/lib/tags/tag-service'
import { EisenhowerMatrix } from '@/components/opportunities/EisenhowerMatrix'
import { KanbanBoard } from '@/components/opportunities/KanbanBoard'
import {
  Target,
  Search,
  Star,
  Plus,
  Zap,
  CheckCircle2,
  Pencil,
  Trash2,
  Grid3X3,
  List,
  Columns3,
} from 'lucide-react'
import { toast } from 'sonner'

export function Opportunities() {
  const { id: opportunityId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    opportunities,
    domains,
    goals,
    isLoading,
    addOpportunity,
    updateOpportunity,
    deleteOpportunity,
    moveOpportunityStatus,
  } = useLocalData()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<OpportunityStatus | 'All'>('All')
  const [viewMode, setViewMode] = useState<'list' | 'matrix' | 'kanban'>('list')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingOpp, setEditingOpp] = useState<Opportunity | null>(null)
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null)
  const [dueFilter, setDueFilter] = useState<'all' | 'due_today' | 'overdue' | 'this_week'>('all')
  const { addXP, awardTaskComplete } = useXPSystem()
  const { setCurrentOpportunity, toggleDeepWorkMode } = useAppContext()

  // Deep link: open opportunity dialog when URL has /opportunities/:id
  useEffect(() => {
    if (!opportunityId || !opportunities) return
    const opp = opportunities.find((o) => o.id === opportunityId)
    if (opp) {
      setEditingOpp(opp)
      setDialogOpen(true)
    }
  }, [opportunityId, opportunities])

  const domainMap = useMemo(() => {
    if (!domains) return new Map<string, LifeDomain>()
    return new Map(domains.map((d) => [d.id, d]))
  }, [domains])

  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const weekEnd = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d.toISOString().slice(0, 10)
  }, [])

  const filteredOpportunities = useMemo(() => {
    if (!opportunities) return []
    return opportunities.filter((opp) => {
      const matchesSearch = searchQuery === '' ||
        opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opp.description?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = selectedStatus === 'All' ||
        opp.status.toLowerCase() === selectedStatus.toLowerCase()
      const matchesTag = selectedTagId === null ||
        getTagsForOpportunity(opp.id).includes(selectedTagId)
      const matchesDue = (() => {
        if (dueFilter === 'all') return true
        const due = opp.due_date?.slice(0, 10)
        if (!due) return false
        if (dueFilter === 'overdue') return due < today
        if (dueFilter === 'due_today') return due === today
        if (dueFilter === 'this_week') return due >= today && due <= weekEnd
        return true
      })()
      return matchesSearch && matchesStatus && matchesTag && matchesDue
    })
  }, [opportunities, searchQuery, selectedStatus, selectedTagId, dueFilter, today, weekEnd])

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
    moveOpportunityStatus(opp.id, 'done')
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
  }, [addXP, awardTaskComplete, moveOpportunityStatus])

  const handleFocus = useCallback((opp: Opportunity) => {
    setCurrentOpportunity(opp)
    toggleDeepWorkMode()
  }, [setCurrentOpportunity, toggleDeepWorkMode])

  const handleSave = useCallback((data: Omit<Opportunity, 'id' | 'user_id' | 'created_at' | 'domain'>, tagIds?: string[]) => {
    if (editingOpp) {
      updateOpportunity(editingOpp.id, data)
      toast.success('Opportunity updated!')
    } else {
      const newOpp = addOpportunity(data)
      if (newOpp && tagIds?.length) setTagsForOpportunity(newOpp.id, tagIds)
      addXP(5)
      toast.success('Opportunity created! +5 XP')
    }
    setEditingOpp(null)
  }, [editingOpp, updateOpportunity, addOpportunity, addXP])

  const handleDelete = useCallback((opp: Opportunity) => {
    deleteOpportunity(opp.id)
    toast.success('Opportunity deleted')
  }, [deleteOpportunity])

  const handleEdit = useCallback((opp: Opportunity) => {
    setEditingOpp(opp)
    setDialogOpen(true)
  }, [])

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Opportunities</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-border/50">
              <Button
                variant="ghost"
                size="icon"
                className={cn('h-8 w-8 rounded-r-none', viewMode === 'list' && 'bg-primary/10 text-primary')}
                onClick={() => setViewMode('list')}
                title="List view"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn('h-8 w-8 rounded-none', viewMode === 'kanban' && 'bg-primary/10 text-primary')}
                onClick={() => setViewMode('kanban')}
                title="Kanban board"
              >
                <Columns3 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn('h-8 w-8 rounded-l-none', viewMode === 'matrix' && 'bg-primary/10 text-primary')}
                onClick={() => setViewMode('matrix')}
                title="Eisenhower matrix"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </div>
            <Button
              className="gap-2"
              onClick={() => {
                setEditingOpp(null)
                setDialogOpen(true)
              }}
            >
              <Plus className="h-4 w-4" />New
            </Button>
          </div>
        </div>
      </header>

      {viewMode === 'matrix' ? (
        <EisenhowerMatrix
          opportunities={filteredOpportunities}
          onSelect={(opp) => handleEdit(opp)}
        />
      ) : viewMode === 'kanban' ? (
        <KanbanBoard
          opportunities={filteredOpportunities}
          domainMap={domainMap}
          onComplete={handleComplete}
          onEdit={handleEdit}
          onFocus={handleFocus}
          onMoveStatus={moveOpportunityStatus}
        />
      ) : (
        <>
          <div className="mb-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search opportunities..." className="pl-9" />
            </div>
            <TagFilter selectedTagId={selectedTagId} onSelectTag={setSelectedTagId} className="mb-2" />
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-muted-foreground mr-1">Due:</span>
              {(['all', 'due_today', 'overdue', 'this_week'] as const).map((key) => (
                <button key={key} onClick={() => setDueFilter(key)}
                  className={cn('rounded-full px-3 py-1 text-sm font-medium transition-colors',
                    dueFilter === key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80')}>
                  {key === 'all' ? 'All' : key === 'due_today' ? 'Due today' : key === 'overdue' ? 'Overdue' : 'This week'}
                </button>
              ))}
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
              <EmptyState
                icon={Target}
                title={searchQuery || selectedStatus !== 'All' ? 'No opportunities match your filters.' : 'No opportunities yet. Create one!'}
                actionLabel={searchQuery || selectedStatus !== 'All' ? undefined : 'New opportunity'}
                onAction={searchQuery || selectedStatus !== 'All' ? undefined : () => { setEditingOpp(null); setDialogOpen(true) }}
              />
            ) : filteredOpportunities.length > 30 ? (
              <VirtualList
                items={filteredOpportunities}
                itemHeight={140}
                className="h-[calc(100vh-280px)]"
                getItemKey={(opp) => opp.id}
                renderItem={(opp) => (
                  <div className="pb-3">
                    <SwipeableCard
                      opp={opp}
                      domainMap={domainMap}
                      onComplete={handleComplete}
                      onDelete={handleDelete}
                      onFocus={handleFocus}
                      onEdit={handleEdit}
                    />
                  </div>
                )}
              />
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {filteredOpportunities.map((opp) => (
                    <SwipeableCard
                      key={opp.id}
                      opp={opp}
                      domainMap={domainMap}
                      onComplete={handleComplete}
                      onDelete={handleDelete}
                      onFocus={handleFocus}
                      onEdit={handleEdit}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </ScrollArea>
        </>
      )}

      <OpportunityDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open && opportunityId) navigate('/opportunities', { replace: true })
          if (!open) setEditingOpp(null)
        }}
        opportunity={editingOpp}
        domains={domains || []}
        goals={goals?.map((g) => ({ id: g.id, title: g.title })) ?? []}
        onSave={handleSave}
      />
    </div>
  )
}

const SwipeableCard = memo(function SwipeableCard({
  opp,
  domainMap,
  onComplete,
  onDelete,
  onFocus,
  onEdit,
}: {
  opp: Opportunity
  domainMap: Map<string, LifeDomain>
  onComplete: (opp: Opportunity) => void
  onDelete: (opp: Opportunity) => void
  onFocus: (opp: Opportunity) => void
  onEdit: (opp: Opportunity) => void
}) {
  const x = useMotionValue(0)
  const background = useTransform(x, [-150, 0, 150], [
    'rgba(239, 68, 68, 0.2)',
    'rgba(0, 0, 0, 0)',
    'rgba(34, 197, 94, 0.2)',
  ])
  const domain = opp.domain_id ? domainMap.get(opp.domain_id) : null
  const priorityStars = Math.min(Math.max(Math.round(opp.priority / 2), 1), 5)
  const statusKey = (opp.status.charAt(0).toUpperCase() + opp.status.slice(1)) as OpportunityStatus
  const xpReward = calculateXPReward(opp.type, opp.strategic_value ?? 5)

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (info.offset.x > 100 && opp.status !== 'done') {
      onComplete(opp)
    } else if (info.offset.x < -100) {
      onDelete(opp)
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{ background }}
      className="rounded-xl"
    >
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.3}
        onDragEnd={handleDragEnd}
        style={{ x }}
      >
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
                {getAllTags()
                  .filter((t) => getTagsForOpportunity(opp.id).includes(t.id))
                  .map((t) => (
                    <TagBadge key={t.id} tag={t} />
                  ))}
                <Badge variant="secondary" className="text-xs capitalize">{opp.type}</Badge>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={cn('h-3 w-3', i < priorityStars ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30')} />
                  ))}
                </div>
                <span className="text-[10px] text-amber-400 font-medium">{xpReward} XP</span>
                {opp.due_date && opp.due_date.slice(0, 10) < new Date().toISOString().slice(0, 10) && (
                  <Badge variant="destructive" className="text-xs">Overdue</Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden gap-1 group-hover:flex">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(opp)}>
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </Button>
                {opp.status !== 'done' && (
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onComplete(opp)}>
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                  </Button>
                )}
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onFocus(opp)}>
                  <Zap className="h-4 w-4 text-primary" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onDelete(opp)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <Badge className="shrink-0 capitalize text-white" style={{ backgroundColor: STATUS_COLORS[statusKey] }}>
                {opp.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
})
