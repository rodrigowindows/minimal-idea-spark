import type { PromptEvent } from '@/types/night-worker'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, AlertTriangle, ArrowRight, Loader2, Clock } from 'lucide-react'

const EVENT_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  processing_started: { icon: Loader2, color: 'text-blue-400', label: 'Processando' },
  processing_completed: { icon: CheckCircle2, color: 'text-emerald-400', label: 'Completo' },
  pipeline_chaining: { icon: ArrowRight, color: 'text-purple-400', label: 'Pipeline' },
  pipeline_step_created: { icon: ArrowRight, color: 'text-purple-400', label: 'Step criado' },
  pipeline_inherited: { icon: ArrowRight, color: 'text-purple-300', label: 'Herdado' },
  rate_limited: { icon: AlertTriangle, color: 'text-amber-400', label: 'Rate limit' },
  done: { icon: CheckCircle2, color: 'text-emerald-400', label: 'Concluido' },
  failed: { icon: XCircle, color: 'text-red-400', label: 'Falhou' },
  edit: { icon: Clock, color: 'text-yellow-400', label: 'Editado' },
  reprocessed: { icon: Clock, color: 'text-cyan-400', label: 'Reprocessado' },
  reprocess_requested: { icon: Clock, color: 'text-cyan-400', label: 'Reprocessamento' },
}

const DEFAULT_CONFIG = { icon: Clock, color: 'text-muted-foreground', label: 'Evento' }

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString()
}

export function PromptEventLog({ events }: { events: PromptEvent[] }) {
  if (!events || events.length === 0) {
    return <p className="text-sm text-muted-foreground italic">Nenhum evento registrado.</p>
  }

  const sorted = [...events].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return (
    <div className="space-y-1">
      {sorted.map((event) => {
        const cfg = EVENT_CONFIG[event.type] ?? DEFAULT_CONFIG
        const Icon = cfg.icon
        return (
          <div
            key={event.id}
            className="flex items-start gap-3 rounded-lg border border-border/40 bg-background/30 px-3 py-2"
          >
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${cfg.color} ${event.type === 'processing_started' ? 'animate-spin' : ''}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {cfg.label}
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  {formatDate(event.created_at)} {formatTime(event.created_at)}
                </span>
              </div>
              {event.message && (
                <p className="mt-0.5 text-xs text-foreground/80 break-words">{event.message}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
