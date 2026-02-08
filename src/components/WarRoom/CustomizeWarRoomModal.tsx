import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useWarRoomLayout, WIDGET_IDS, type WidgetId } from '@/contexts/WarRoomLayoutContext'
import { GripVertical } from 'lucide-react'

const WIDGET_LABELS: Record<WidgetId, string> = {
  'smart-capture': 'Smart Capture',
  'the-one-thing': 'The One Thing',
  'opportunity-radar': 'Opportunity Radar',
  'time-blocking': 'Time Blocking',
  'quick-journal': 'Quick Journal',
  'activity-heatmap': 'Activity Heatmap',
}

function SortableItem({ id, label, visible, onToggle }: { id: WidgetId; label: string; visible: boolean; onToggle: (v: boolean) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border border-border p-3"
    >
      <button type="button" className="touch-none cursor-grab" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <span className="flex-1 text-sm font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <Label htmlFor={`vis-${id}`} className="text-xs text-muted-foreground">Show</Label>
        <Switch id={`vis-${id}`} checked={visible} onCheckedChange={onToggle} />
      </div>
    </div>
  )
}

interface CustomizeWarRoomModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CustomizeWarRoomModal({ open, onOpenChange }: CustomizeWarRoomModalProps) {
  const { t } = useTranslation()
  const { layout, setOrder, setVisible, resetLayout } = useWarRoomLayout()

  const sensors = useSensors(
    useSensor(PointerSensor),
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Customize War Room</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Drag to reorder. Toggle visibility with the switch.
        </p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={layout.order}>
            <div className="space-y-2">
              {layout.order.map((id) => (
                <SortableItem
                  key={id}
                  id={id}
                  label={WIDGET_LABELS[id] ?? id}
                  visible={layout.visible[id] ?? true}
                  onToggle={(v) => setVisible(id, v)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <DialogFooter>
          <Button variant="outline" onClick={resetLayout}>
            {t('dashboard.warRoomRestoreDefault')}
          </Button>
          <Button onClick={() => onOpenChange(false)}>{t('common.done')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
