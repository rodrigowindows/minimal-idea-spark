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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { useWarRoomLayout, WIDGET_IDS, type WidgetId, type WidgetSize } from '@/contexts/WarRoomLayoutContext'
import { useTranslation } from '@/contexts/LanguageContext'
import { GripVertical, Minimize2, Square, Maximize2 } from 'lucide-react'

const WIDGET_LABELS: Record<WidgetId, string> = {
  'smart-capture': 'Smart Capture',
  'the-one-thing': 'The One Thing',
  'opportunity-radar': 'Opportunity Radar',
  'time-blocking': 'Time Blocking',
  'quick-journal': 'Quick Journal',
  'activity-heatmap': 'Activity Heatmap',
  'goals-okr': 'Metas & OKRs',
}

const SIZE_ICONS: Record<WidgetSize, typeof Minimize2> = {
  compact: Minimize2,
  normal: Square,
  large: Maximize2,
}

interface SortableItemProps {
  id: WidgetId
  label: string
  visible: boolean
  size: WidgetSize
  onToggle: (v: boolean) => void
  onSizeChange: (s: WidgetSize) => void
}

function SortableItem({ id, label, visible, size, onToggle, onSizeChange }: SortableItemProps) {
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
      <Select value={size} onValueChange={(v) => onSizeChange(v as WidgetSize)}>
        <SelectTrigger className="h-8 w-[110px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(['compact', 'normal', 'large'] as WidgetSize[]).map((s) => {
            const Icon = SIZE_ICONS[s]
            return (
              <SelectItem key={s} value={s}>
                <span className="flex items-center gap-1.5">
                  <Icon className="h-3 w-3" />
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </span>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
      <div className="flex items-center gap-2">
        <Label htmlFor={`vis-${id}`} className="text-xs text-muted-foreground sr-only">Show</Label>
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
  const { layout, setOrder, setVisible, setSize, resetLayout } = useWarRoomLayout()

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
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('dashboard.customizeWarRoom')}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {t('dashboard.customizeDesc')}
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
                  size={layout.sizes[id] ?? 'normal'}
                  onToggle={(v) => setVisible(id, v)}
                  onSizeChange={(s) => setSize(id, s)}
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
