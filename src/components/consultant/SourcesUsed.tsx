import type { ContextSource } from '@/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Target, BookOpen, FileText, ChevronDown, ChevronUp, Zap, Star } from 'lucide-react'
import { useState } from 'react'

interface SourcesUsedProps {
  sources: ContextSource[]
}

const sourceConfig = {
  opportunity: { icon: Target, label: 'Opportunity', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  journal: { icon: BookOpen, label: 'Journal', color: 'text-green-500', bg: 'bg-green-500/10' },
  knowledge: { icon: FileText, label: 'Knowledge', color: 'text-purple-500', bg: 'bg-purple-500/10' },
}

function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'doing': return 'default'
    case 'done': return 'secondary'
    case 'review': return 'outline'
    default: return 'secondary'
  }
}

function SourceDetail({ source }: { source: ContextSource }) {
  const meta = source.metadata
  if (!meta) return null

  if (source.type === 'opportunity') {
    return (
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        {meta.status && (
          <Badge variant={getStatusBadgeVariant(meta.status as string)} className="text-[10px] px-1.5 py-0">
            {(meta.status as string).toUpperCase()}
          </Badge>
        )}
        {meta.priority && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
            <Zap className="h-2.5 w-2.5" />
            P{meta.priority as number}
          </span>
        )}
        {meta.strategic_value && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
            <Star className="h-2.5 w-2.5" />
            SV:{meta.strategic_value as number}
          </span>
        )}
        {meta.type && (
          <span className="text-[10px] text-muted-foreground capitalize">
            {meta.type as string}
          </span>
        )}
      </div>
    )
  }

  if (source.type === 'journal') {
    return (
      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
        {meta.log_date && <span>{meta.log_date as string}</span>}
        {meta.mood && <span>Mood: {meta.mood as string}</span>}
        {meta.energy_level && <span>Energy: {meta.energy_level as number}/10</span>}
      </div>
    )
  }

  return null
}

export function SourcesUsed({ sources }: SourcesUsedProps) {
  const [expanded, setExpanded] = useState(false)

  if (!sources || sources.length === 0) return null

  const groupedByType = sources.reduce<Record<string, ContextSource[]>>((acc, s) => {
    ;(acc[s.type] ||= []).push(s)
    return acc
  }, {})

  return (
    <Card className="mt-2 border-dashed border-muted-foreground/30 bg-muted/30 p-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <span className="flex items-center gap-2">
          Sources used ({sources.length})
          {!expanded && (
            <span className="flex gap-1">
              {Object.entries(groupedByType).map(([type, items]) => {
                const config = sourceConfig[type as keyof typeof sourceConfig]
                const Icon = config.icon
                return (
                  <span key={type} className={`inline-flex items-center gap-0.5 ${config.color}`}>
                    <Icon className="h-3 w-3" />
                    <span className="text-[10px]">{items.length}</span>
                  </span>
                )
              })}
            </span>
          )}
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
                className={`rounded-md px-2.5 py-2 text-xs ${config.bg}`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${config.color}`} />
                  <span className="flex-1 truncate font-medium">{source.title}</span>
                  <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0">
                    {config.label}
                  </Badge>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {relevancePct}%
                  </span>
                </div>
                <SourceDetail source={source} />
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
