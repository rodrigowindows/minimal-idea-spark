import { memo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from './StatusBadge'
import { ProviderBadge } from './ProviderBadge'
import { GripVertical } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { PromptItem } from '@/types/night-worker'

interface KanbanCardProps {
  prompt: PromptItem
  isDraggable: boolean
}

export const KanbanCard = memo(function KanbanCard({ prompt, isDraggable }: KanbanCardProps) {
  const navigate = useNavigate()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: prompt.id,
    disabled: !isDraggable,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`mb-2 border border-border/60 bg-card/80 hover:border-blue-500/40 transition-colors ${
        isDragging ? 'shadow-xl cursor-grabbing' : isDraggable ? 'cursor-grab' : ''
      }`}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          {isDraggable && (
            <div
              {...attributes}
              {...listeners}
              className="mt-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
            >
              <GripVertical className="h-4 w-4" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={prompt.status} pulse={prompt.status === 'pending'} />
              <ProviderBadge provider={prompt.provider} />
            </div>
            <h4 className="text-sm font-semibold text-foreground truncate mb-1">
              {prompt.name}
            </h4>
            <p className="text-xs text-muted-foreground truncate font-mono">
              {prompt.target_folder || '—'}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/nw/prompts/${prompt.id}`)}
              className="mt-2 h-7 text-xs"
            >
              Ver detalhes
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})
