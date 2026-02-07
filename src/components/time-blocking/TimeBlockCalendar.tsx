import { useState, useMemo } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTimeBlocking } from '@/hooks/useTimeBlocking'
import { useXPSystem } from '@/hooks/useXPSystem'
import { TIME_BLOCK_DEFAULTS } from '@/lib/constants'
import type { Opportunity, TimeBlock } from '@/types'
import { cn } from '@/lib/utils'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Trash2,
  Play,
  Square,
  Zap,
  GripVertical,
} from 'lucide-react'
import { toast } from 'sonner'

interface TimeBlockCalendarProps {
  opportunities?: Opportunity[]
  className?: string
}

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6) // 6 AM to 10 PM

// --- Sortable Time Block Item ---
function SortableBlock({
  block,
  isActive,
  timerSeconds,
  onStartTimer,
  onStopTimer,
  onRemove,
  formatTimer,
}: {
  block: TimeBlock
  isActive: boolean
  timerSeconds: number
  onStartTimer: (blockId: string, duration: number) => void
  onStopTimer: () => void
  onRemove: (blockId: string) => void
  formatTimer: (seconds: number) => string
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center justify-between rounded-lg px-3 py-2 text-sm',
        block.opportunity
          ? 'bg-primary/20 text-primary'
          : 'bg-muted',
        isActive && 'ring-2 ring-primary'
      )}
    >
      <div className="flex items-center gap-2">
        <button
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="font-medium">
          {block.opportunity?.title || 'Free block'}
        </span>
        <Badge variant="outline" className="text-xs">
          {block.block_duration}min
        </Badge>
      </div>

      <div className="flex items-center gap-1">
        {isActive ? (
          <>
            <span className="mr-2 font-mono text-sm">
              {formatTimer(timerSeconds)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onStopTimer}
            >
              <Square className="h-3 w-3" />
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onStartTimer(block.id, block.block_duration)}
            >
              <Play className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive"
              onClick={() => onRemove(block.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

// --- Draggable Opportunity Chip ---
function DraggableOpportunity({ opportunity }: { opportunity: Opportunity }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `opp-drag-${opportunity.id}`,
    data: { type: 'opportunity', opportunity },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab rounded-lg border border-border/50 bg-card px-2 py-1 text-xs active:cursor-grabbing"
      title={opportunity.title}
    >
      {opportunity.title.length > 20 ? `${opportunity.title.slice(0, 20)}...` : opportunity.title}
    </div>
  )
}

export function TimeBlockCalendar({ opportunities, className }: TimeBlockCalendarProps) {
  const {
    blocks,
    selectedDate,
    setSelectedDate,
    addBlock,
    removeBlock,
    moveBlock,
    assignOpportunity,
    getBlocksTotal,
  } = useTimeBlocking()

  const { awardDeepWork } = useXPSystem()

  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null)

  const totalMinutes = getBlocksTotal()
  const totalHours = Math.floor(totalMinutes / 60)
  const totalMins = totalMinutes % 60

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  )

  const dateDisplay = useMemo(() => {
    const date = new Date(selectedDate)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    })
  }, [selectedDate])

  function navigateDate(delta: number) {
    const current = new Date(selectedDate)
    current.setDate(current.getDate() + delta)
    setSelectedDate(current.toISOString().split('T')[0])
  }

  function handleAddBlock(hour: number, opportunity?: Opportunity) {
    const startTime = `${hour.toString().padStart(2, '0')}:00`
    addBlock(startTime, TIME_BLOCK_DEFAULTS.DEFAULT_DURATION, opportunity)
    toast.success(opportunity ? `Scheduled: ${opportunity.title}` : 'Time block added!')
  }

  function handleRemoveBlock(blockId: string) {
    removeBlock(blockId)
    toast.success('Time block removed')
  }

  function handleStartTimer(blockId: string, duration: number) {
    setActiveBlockId(blockId)
    setTimerSeconds(duration * 60)

    const interval = setInterval(() => {
      setTimerSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          setActiveBlockId(null)
          awardDeepWork(duration)
          toast.success(
            <div className="flex items-center gap-2">
              <span>Deep work session complete!</span>
              <Badge variant="secondary" className="gap-1 bg-amber-500/20 text-amber-400">
                <Zap className="h-3 w-3" />
                +{Math.floor(duration / 25) * 50} XP
              </Badge>
            </div>
          )
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  function handleStopTimer() {
    setActiveBlockId(null)
    setTimerSeconds(0)
  }

  function formatTimer(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  function handleDragStart(event: DragStartEvent) {
    const { active } = event
    setDraggedBlockId(active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggedBlockId(null)
    const { active, over } = event

    if (!over || active.id === over.id) return

    const activeId = active.id as string
    const overId = over.id as string

    // Case 1: Dragging an opportunity chip onto an hour slot
    if (activeId.startsWith('opp-drag-')) {
      const oppData = active.data.current as { type: string; opportunity: Opportunity } | undefined
      if (oppData?.type === 'opportunity' && overId.startsWith('hour-')) {
        const hour = parseInt(overId.replace('hour-', ''), 10)
        handleAddBlock(hour, oppData.opportunity)
        return
      }
    }

    // Case 2: Dragging a block to reorder/move to another hour slot
    if (overId.startsWith('hour-')) {
      const newHour = parseInt(overId.replace('hour-', ''), 10)
      const newStartTime = `${newHour.toString().padStart(2, '0')}:00`
      moveBlock(activeId, newStartTime)
      toast.success('Block moved!')
      return
    }

    // Case 3: Reordering blocks within the same hour — swap start times
    const activeBlock = blocks.find(b => b.id === activeId)
    const overBlock = blocks.find(b => b.id === overId)
    if (activeBlock && overBlock) {
      moveBlock(activeId, overBlock.block_start)
      moveBlock(overId, activeBlock.block_start)
      toast.success('Blocks reordered!')
    }
  }

  // Build all sortable IDs: block ids + opportunity drag ids + hour drop zones
  const allBlockIds = blocks.map(b => b.id)
  const oppDragIds = (opportunities ?? [])
    .filter(o => o.status === 'doing' || o.status === 'backlog')
    .slice(0, 4)
    .map(o => `opp-drag-${o.id}`)
  const hourDropIds = HOURS.map(h => `hour-${h}`)

  const allSortableIds = [...allBlockIds, ...oppDragIds, ...hourDropIds]

  return (
    <Card className={cn('rounded-xl', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            Time Blocking
          </CardTitle>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            {totalHours}h {totalMins}m scheduled
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigateDate(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">{dateDisplay}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigateDate(1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={allSortableIds} strategy={verticalListSortingStrategy}>
            {/* Timeline */}
            <div className="max-h-[400px] space-y-1 overflow-y-auto">
              {HOURS.map((hour) => {
                const blocksAtHour = blocks.filter(b => {
                  const blockHour = parseInt(b.block_start.split(':')[0], 10)
                  return blockHour === hour
                })

                return (
                  <DroppableHourSlot key={hour} hour={hour}>
                    {/* Hour label */}
                    <div className="w-12 shrink-0 pt-1 text-xs text-muted-foreground">
                      {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                    </div>

                    {/* Blocks */}
                    <div className="flex min-h-[40px] flex-1 flex-col gap-1">
                      {blocksAtHour.length > 0 ? (
                        blocksAtHour.map((block) => (
                          <SortableBlock
                            key={block.id}
                            block={block}
                            isActive={activeBlockId === block.id}
                            timerSeconds={timerSeconds}
                            onStartTimer={handleStartTimer}
                            onStopTimer={handleStopTimer}
                            onRemove={handleRemoveBlock}
                            formatTimer={formatTimer}
                          />
                        ))
                      ) : (
                        <button
                          onClick={() => handleAddBlock(hour)}
                          className="flex h-full min-h-[32px] w-full items-center justify-center rounded-lg border border-dashed border-border/50 text-muted-foreground opacity-0 transition-opacity hover:border-primary/50 hover:text-primary group-hover:opacity-100"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </DroppableHourSlot>
                )
              })}
            </div>

            {/* Quick Add Opportunities (Draggable) */}
            {opportunities && opportunities.length > 0 && (
              <div className="space-y-2 border-t border-border/50 pt-4">
                <p className="text-xs font-medium text-muted-foreground">
                  Drag opportunities to a time slot
                </p>
                <div className="flex flex-wrap gap-2">
                  {opportunities
                    .filter(o => o.status === 'doing' || o.status === 'backlog')
                    .slice(0, 4)
                    .map((opp) => (
                      <DraggableOpportunity key={opp.id} opportunity={opp} />
                    ))}
                </div>
              </div>
            )}
          </SortableContext>

          <DragOverlay>
            {draggedBlockId && (() => {
              const block = blocks.find(b => b.id === draggedBlockId)
              if (block) {
                return (
                  <div className="rounded-lg bg-primary/20 px-3 py-2 text-sm shadow-lg">
                    <span className="font-medium">
                      {block.opportunity?.title || 'Free block'}
                    </span>
                  </div>
                )
              }
              // Opportunity being dragged
              if (draggedBlockId.startsWith('opp-drag-')) {
                const oppId = draggedBlockId.replace('opp-drag-', '')
                const opp = opportunities?.find(o => o.id === oppId)
                if (opp) {
                  return (
                    <div className="rounded-lg border border-primary bg-card px-2 py-1 text-xs shadow-lg">
                      {opp.title.length > 20 ? `${opp.title.slice(0, 20)}...` : opp.title}
                    </div>
                  )
                }
              }
              return null
            })()}
          </DragOverlay>
        </DndContext>
      </CardContent>
    </Card>
  )
}

// --- Droppable Hour Slot (uses useSortable as drop target) ---
function DroppableHourSlot({
  hour,
  children,
}: {
  hour: number
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useSortable({
    id: `hour-${hour}`,
    data: { type: 'hour-slot', hour },
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'group flex items-stretch gap-2 rounded-lg px-2 py-1 transition-colors',
        isOver ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted/50'
      )}
    >
      {children}
    </div>
  )
}
