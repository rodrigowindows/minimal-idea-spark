import { type ReactNode } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useWarRoomLayout, type WidgetId, type WidgetSize } from '@/contexts/WarRoomLayoutContext'
import { GripVertical } from 'lucide-react'

const BASE_COL_SPAN: Record<WidgetId, Record<WidgetSize, string>> = {
  'smart-capture': {
    compact: 'col-span-12 lg:col-span-6',
    normal: 'col-span-12',
    large: 'col-span-12',
  },
  'the-one-thing': {
    compact: 'col-span-12 lg:col-span-4',
    normal: 'col-span-12 lg:col-span-8',
    large: 'col-span-12',
  },
  'opportunity-radar': {
    compact: 'col-span-12 lg:col-span-3',
    normal: 'col-span-12 lg:col-span-4',
    large: 'col-span-12 lg:col-span-6',
  },
  'time-blocking': {
    compact: 'col-span-12 lg:col-span-4',
    normal: 'col-span-12 lg:col-span-8',
    large: 'col-span-12',
  },
  'quick-journal': {
    compact: 'col-span-12 lg:col-span-3',
    normal: 'col-span-12 lg:col-span-4',
    large: 'col-span-12 lg:col-span-6',
  },
  'activity-heatmap': {
    compact: 'col-span-12 lg:col-span-6',
    normal: 'col-span-12',
    large: 'col-span-12',
  },
  'goals-okr': {
    compact: 'col-span-12 lg:col-span-4',
    normal: 'col-span-12 lg:col-span-6',
    large: 'col-span-12',
  },
}

function getColSpan(widgetId: WidgetId, size: WidgetSize): string {
  return BASE_COL_SPAN[widgetId]?.[size] ?? 'col-span-12'
}

interface SortableWidgetProps {
  id: WidgetId
  size: WidgetSize
  children: ReactNode
}

function SortableWidget({ id, size, children }: SortableWidgetProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const colSpan = getColSpan(id, size)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${colSpan} relative group ${isDragging ? 'z-50 opacity-75' : ''}`}
    >
      <button
        type="button"
        className="absolute -left-1 top-2 z-10 rounded bg-background/80 p-1 opacity-0 shadow-sm backdrop-blur transition-opacity group-hover:opacity-100 touch-none cursor-grab"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      {children}
    </div>
  )
}

interface WidgetGridProps {
  children: (widgetId: WidgetId, size: WidgetSize) => ReactNode
}

export function WidgetGrid({ children }: WidgetGridProps) {
  const { layout, setOrder } = useWarRoomLayout()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const current = layout.order as string[]
    const oldIdx = current.indexOf(active.id as string)
    const newIdx = current.indexOf(over.id as string)
    if (oldIdx === -1 || newIdx === -1) return
    setOrder(arrayMove(current, oldIdx, newIdx) as WidgetId[])
  }

  const visibleWidgets = layout.order.filter((id) => layout.visible[id])

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={visibleWidgets}>
        <div className="grid gap-6 md:gap-8 lg:grid-cols-12">
          {visibleWidgets.map((widgetId) => {
            const size = layout.sizes[widgetId] ?? 'normal'
            const content = children(widgetId, size)
            if (!content) return null
            return (
              <SortableWidget key={widgetId} id={widgetId} size={size}>
                {content}
              </SortableWidget>
            )
          })}
        </div>
      </SortableContext>
    </DndContext>
  )
}
