import { memo, useMemo, useCallback, useState } from 'react'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { KanbanColumn } from './KanbanColumn'
import { KanbanCard } from './KanbanCard'
import type { PromptItem } from '@/types/night-worker'

const COLUMN_IDS = ['backlog', 'prioritized', 'doing', 'done', 'failed'] as const
type ColumnId = (typeof COLUMN_IDS)[number]

interface PromptsKanbanProps {
  prompts: PromptItem[]
  prioritizedIds: string[]
  doingIds: string[]
  onMoveToBacklog: (id: string) => void
  onMoveToPrioritized: (id: string, index?: number) => void
  onMoveToDoing: (id: string) => void
  onReorderPrioritized: (ids: string[]) => void
}

export const PromptsKanban = memo(function PromptsKanban({
  prompts,
  prioritizedIds,
  doingIds,
  onMoveToBacklog,
  onMoveToPrioritized,
  onMoveToDoing,
  onReorderPrioritized,
}: PromptsKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  // Configure sensors for better drag experience
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts (prevents accidental drags)
      },
    })
  )

  // Memoize column data (heavy computation)
  const columns = useMemo(() => {
    const pending = prompts.filter((p) => p.status === 'pending')
    const processing = prompts.filter((p) => p.status === 'processing')
    const pendingById = new Map(pending.map((p) => [p.id, p] as const))
    const prioritizedSet = new Set(prioritizedIds)
    const doingSet = new Set(doingIds)

    // Backlog: pending prompts not in prioritized or doing
    const backlog = pending.filter((p) => !prioritizedSet.has(p.id) && !doingSet.has(p.id))

    // Prioritized: maintain order from prioritizedIds
    const prioritized = prioritizedIds
      .map((id) => pendingById.get(id))
      .filter((p): p is PromptItem => p !== undefined)

    // Doing: prompts explicitly in doingIds plus server-side processing prompts
    const doing = [...processing, ...pending.filter((p) => doingSet.has(p.id))]

    // Done/Failed: read-only columns
    const done = prompts.filter((p) => p.status === 'done')
    const failed = prompts.filter((p) => p.status === 'failed')

    return { backlog, prioritized, doing, done, failed }
  }, [prompts, prioritizedIds, doingIds])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveId(null)

      if (!over) return

      const activeId = active.id as string
      const overId = over.id as string

      const sourceColumn = getColumnForId(activeId, columns, prioritizedIds, doingIds)
      const isColumnDrop = (COLUMN_IDS as readonly string[]).includes(overId)
      const isKnownPromptDrop = Object.values(columns).some((items) => items.some((p) => p.id === overId))
      if (!isColumnDrop && !isKnownPromptDrop) return

      // When dropping on a card, over.id is the prompt id; resolve which column that card is in
      const destColumn: ColumnId = isColumnDrop
        ? (overId as ColumnId)
        : getColumnForId(overId, columns, prioritizedIds, doingIds)

      if (destColumn === 'done' || destColumn === 'failed') return
      if (sourceColumn === destColumn && sourceColumn !== 'prioritized') return

      // Reorder within prioritized: dropped on another card in same column
      if (sourceColumn === 'prioritized' && destColumn === 'prioritized' && activeId !== overId) {
        const oldIndex = prioritizedIds.indexOf(activeId)
        const newIndex = prioritizedIds.indexOf(overId)
        if (oldIndex >= 0 && newIndex >= 0) {
          onReorderPrioritized(arrayMove(prioritizedIds, oldIndex, newIndex))
        }
        return
      }

      // Move between columns
      if (sourceColumn !== destColumn) {
        if (destColumn === 'backlog') onMoveToBacklog(activeId)
        else if (destColumn === 'doing') onMoveToDoing(activeId)
        else if (destColumn === 'prioritized') {
          const index = columns.prioritized.findIndex((p) => p.id === overId)
          onMoveToPrioritized(activeId, index >= 0 ? index : undefined)
        }
      }
    },
    [columns, prioritizedIds, doingIds, onMoveToBacklog, onMoveToPrioritized, onMoveToDoing, onReorderPrioritized]
  )

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
  }, [])

  // Get active prompt for drag overlay
  const activePrompt = useMemo(
    () => (activeId ? prompts.find((p) => p.id === activeId) : null),
    [activeId, prompts]
  )

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        <KanbanColumn
          id="backlog"
          title="Backlog"
          prompts={columns.backlog}
          isDraggable
          isDroppable
          color="slate"
        />
        <KanbanColumn
          id="prioritized"
          title="Priorizado"
          prompts={columns.prioritized}
          isDraggable
          isDroppable
          color="purple"
        />
        <KanbanColumn
          id="doing"
          title="Doing"
          prompts={columns.doing}
          isDraggable
          isDroppable
          color="orange"
        />
        <KanbanColumn
          id="done"
          title="Done"
          prompts={columns.done}
          isDraggable={false}
          isDroppable={false}
          color="green"
        />
        <KanbanColumn
          id="failed"
          title="Falhas"
          prompts={columns.failed}
          isDraggable={false}
          isDroppable={false}
          color="red"
        />
      </div>

      <DragOverlay>
        {activePrompt && <KanbanCard prompt={activePrompt} isDraggable={false} />}
      </DragOverlay>
    </DndContext>
  )
})

function getColumnForId(
  id: string,
  columns: { backlog: PromptItem[]; prioritized: PromptItem[]; doing: PromptItem[]; done: PromptItem[]; failed: PromptItem[] },
  prioritizedIds: string[],
  doingIds: string[]
): ColumnId {
  if (doingIds.includes(id)) return 'doing'
  if (prioritizedIds.includes(id)) return 'prioritized'
  if (columns.doing.some((p) => p.id === id)) return 'doing'
  if (columns.done.some((p) => p.id === id)) return 'done'
  if (columns.failed.some((p) => p.id === id)) return 'failed'
  return 'backlog'
}
