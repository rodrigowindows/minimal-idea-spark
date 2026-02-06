import type { ContextSource } from '@/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Target, BookOpen, FileText, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

interface SourcesUsedProps {
  sources: ContextSource[]
}

const sourceConfig = {
  opportunity: { icon: Target, label: 'Opportunity', color: 'text-blue-500' },
  journal: { icon: BookOpen, label: 'Journal', color: 'text-green-500' },
  knowledge: { icon: FileText, label: 'Knowledge', color: 'text-purple-500' },
}

export function SourcesUsed({ sources }: SourcesUsedProps) {
  const [expanded, setExpanded] = useState(false)

  if (!sources || sources.length === 0) return null

  return (
    <Card className="mt-2 border-dashed border-muted-foreground/30 bg-muted/30 p-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <span>
          Sources used ({sources.length})
        </span>
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {expanded && (
        <div className="mt-2 space-y-1.5">
          {sources.map((source, idx) => {
            const config = sourceConfig[source.type]
            const Icon = config.icon
            const relevancePct = Math.round(source.relevance * 100)
            return (
              <div
                key={idx}
                className="flex items-center gap-2 rounded-md bg-background/50 px-2 py-1.5 text-xs"
              >
                <Icon className={`h-3.5 w-3.5 shrink-0 ${config.color}`} />
                <span className="flex-1 truncate">{source.title}</span>
                <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0">
                  {config.label}
                </Badge>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {relevancePct}%
                </span>
              </div>
            )
          })}
        </div>
      )}

      {!expanded && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {sources.map((source, idx) => {
            const config = sourceConfig[source.type]
            const Icon = config.icon
            return (
              <Badge key={idx} variant="secondary" className="gap-1 text-xs">
                <Icon className="h-3 w-3" />
                {source.title}
              </Badge>
            )
          })}
        </div>
      )}
    </Card>
  )
}
