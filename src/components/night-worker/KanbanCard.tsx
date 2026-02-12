import { memo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from './StatusBadge'
import { ProviderBadge } from './ProviderBadge'
import { GripVertical, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { PromptItem } from '@/types/night-worker'
import { Badge } from '@/components/ui/badge'

interface KanbanCardProps {
  prompt: PromptItem
  isDraggable: boolean
  isProcessing?: boolean
}

export const KanbanCard = memo(function KanbanCard({ prompt, isDraggable, isProcessing }: KanbanCardProps) {
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
      aria-label={`Prompt ${prompt.name}`}
      className={`mb-2 border transition-all duration-500 ${
        isProcessing 
          ? 'border-blue-500/60 bg-blue-500/5 shadow-[0_0_15px_rgba(59,130,246,0.1)] animate-pulse' 
          : 'border-border/60 bg-card/80'
      } hover:border-blue-500/40 ${
        isDragging ? 'shadow-xl cursor-grabbing' : isDraggable ? 'cursor-grab' : ''
      }`}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          {isDraggable && (
            <button
              type="button"
              {...attributes}
              {...listeners}
              aria-label={`Arrastar prompt ${prompt.name}`}
              className="mt-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={prompt.status} pulse={prompt.status === 'pending' && !isProcessing} />
              <ProviderBadge provider={prompt.provider} />
              {isProcessing && (
                <Badge variant="secondary" className="h-5 gap-1 bg-blue-500/20 text-blue-300 border-blue-500/30 px-1.5 animate-pulse">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Processando</span>
                </Badge>
              )}
              {!isProcessing && prompt.status === 'pending' && prompt.has_result === false && (prompt as any).events?.length > 0 && (
                <Badge variant="outline" className="h-5 bg-emerald-500/10 text-emerald-400 border-emerald-500/30 px-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Recebido</span>
                </Badge>
              )}
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
              aria-label={`Ver detalhes do prompt ${prompt.name}`}
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
