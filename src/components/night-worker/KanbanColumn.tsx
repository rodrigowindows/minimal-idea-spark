import { memo } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { KanbanCard } from './KanbanCard'
import type { PromptItem } from '@/types/night-worker'

interface KanbanColumnProps {
  id: string
  title: string
  prompts: PromptItem[]
  isDraggable: boolean
  isDroppable: boolean
  color?: string
}

export const KanbanColumn = memo(function KanbanColumn({
  id,
  title,
  prompts,
  isDraggable,
  isDroppable,
  color = 'blue',
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    disabled: !isDroppable,
  })

  const colorClasses = {
    blue: 'border-blue-500/40 bg-blue-500/5',
    purple: 'border-purple-500/40 bg-purple-500/5',
    orange: 'border-orange-500/40 bg-orange-500/5',
    green: 'border-green-500/40 bg-green-500/5',
    red: 'border-red-500/40 bg-red-500/5',
    slate: 'border-slate-500/40 bg-slate-500/5',
  }

  return (
    <Card
      ref={setNodeRef}
      role="region"
      aria-label={`Coluna ${title}, ${prompts.length} itens${!isDroppable ? '. Alterado apenas pelo worker.' : ''}`}
      title={!isDroppable ? 'Alterado apenas pelo worker' : undefined}
      className={`flex-shrink-0 w-80 border ${
        isOver && isDroppable ? colorClasses[color as keyof typeof colorClasses] : 'border-border/60'
      } bg-background/40 transition-colors`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground">
            {title}
          </CardTitle>
          <Badge variant="outline" className="rounded-full">
            {prompts.length}
          </Badge>
        </div>
        {id === 'doing' && (
          <p className="text-xs text-muted-foreground mt-1" title="Coluna apenas para sua ordem">
            Doing é só para sua ordem. O processamento é feito pelo worker (worker.py); confira se está rodando.
          </p>
        )}
        {!isDroppable && (
          <p className="text-xs text-muted-foreground mt-1" title="Alterado apenas pelo worker">
            Somente leitura
          </p>
        )}
      </CardHeader>
      <CardContent className="max-h-[600px] overflow-y-auto">
        {prompts.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Nenhum prompt
          </div>
        ) : (
          <SortableContext items={prompts.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            {prompts.map((prompt) => (
              <KanbanCard 
                key={prompt.id} 
                prompt={prompt} 
                isDraggable={isDraggable} 
                isProcessing={id === 'doing'}
              />
            ))}
          </SortableContext>
        )}
      </CardContent>
    </Card>
  )
})
