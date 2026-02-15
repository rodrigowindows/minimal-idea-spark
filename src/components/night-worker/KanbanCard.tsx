import { memo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from './StatusBadge'
import { ProviderBadge } from './ProviderBadge'
import { GripVertical, Loader2, RefreshCw, AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { PromptItem } from '@/types/night-worker'
import { Badge } from '@/components/ui/badge'

interface KanbanCardProps {
  prompt: PromptItem
  isDraggable: boolean
  isProcessing?: boolean
  onReprocess?: (prompt: PromptItem) => void
  isReprocessing?: boolean
}

function timeAgo(dateStr?: string | null): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

export const KanbanCard = memo(function KanbanCard({ prompt, isDraggable, isProcessing, onReprocess, isReprocessing }: KanbanCardProps) {
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

  const isFinal = prompt.status === 'done' || prompt.status === 'failed'

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
        isDragging ? 'cursor-grabbing shadow-xl' : isDraggable ? 'cursor-grab' : ''
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
              className="mt-1 cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <StatusBadge status={prompt.status} pulse={prompt.status === 'pending' && !isProcessing} />
              <ProviderBadge provider={prompt.provider} />
              {isProcessing && (
                <Badge variant="secondary" className="h-5 gap-1 border-blue-500/30 bg-blue-500/20 px-1.5 text-blue-300 animate-pulse">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Processando</span>
                </Badge>
              )}
              {prompt.cloned_from && (
                <Badge variant="outline" className="h-5 border-emerald-500/30 bg-emerald-500/10 px-1.5 text-emerald-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Reprocessado</span>
                </Badge>
              )}
            </div>
            <h4 className="mb-1 truncate text-sm font-semibold text-foreground">
              {prompt.name}
            </h4>

            {/* Error snippet for failed prompts */}
            {prompt.status === 'failed' && prompt.error && (
              <div className="mb-1.5 flex items-start gap-1 rounded bg-red-500/10 px-2 py-1">
                <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0 text-red-400" />
                <p className="line-clamp-2 text-[11px] text-red-300">{prompt.error}</p>
              </div>
            )}

            {/* Result snippet for done prompts */}
            {prompt.status === 'done' && prompt.result_content && (
              <div className="mb-1.5 flex items-start gap-1 rounded bg-emerald-500/10 px-2 py-1">
                <CheckCircle2 className="mt-0.5 h-3 w-3 flex-shrink-0 text-emerald-400" />
                <p className="line-clamp-2 text-[11px] text-emerald-300">{prompt.result_content.slice(0, 150)}</p>
              </div>
            )}

            {/* Timestamp for final states */}
            {isFinal && prompt.updated_at && (
              <div className="mb-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{timeAgo(prompt.updated_at)}</span>
              </div>
            )}

            <p className="truncate font-mono text-xs text-muted-foreground">
              {prompt.target_folder || '-'}
            </p>

            <div className="mt-2 flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/nw/prompts/${prompt.id}`)}
                aria-label={`Ver detalhes do prompt ${prompt.name}`}
                className="h-7 text-xs"
              >
                Ver detalhes
              </Button>
              {isFinal && onReprocess && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onReprocess(prompt)}
                  disabled={isReprocessing}
                  className="h-7 gap-1 text-xs"
                >
                  <RefreshCw className={`h-3 w-3 ${isReprocessing ? 'animate-spin' : ''}`} />
                  Reprocessar
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})
