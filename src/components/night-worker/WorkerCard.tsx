import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock3, Cpu, PauseCircle, PlayCircle, Timer, Folder } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WorkerConfig } from '@/types/night-worker'

interface WorkerCardProps {
  title: string
  config: WorkerConfig
  queue?: number
  lastRun?: string
  nextRetry?: string | null
}

export function WorkerCard({ title, config, queue, lastRun, nextRetry }: WorkerCardProps) {
  const active = config.active
  return (
    <Card className={cn(
      'relative h-full overflow-hidden border bg-card/70 backdrop-blur-sm',
      active ? 'border-emerald-500/50 shadow-[0_0_0_1px_rgba(16,185,129,0.35)]' : 'border-border/70'
    )}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent" aria-hidden />
      <div className="relative flex items-center justify-between border-b border-border/60 px-5 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Worker</p>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        </div>
        <Badge
          variant="outline"
          className={cn(
            'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
            active
              ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
              : 'border-border/70 bg-border/20 text-muted-foreground'
          )}
        >
          {active ? <PlayCircle className="h-4 w-4" /> : <PauseCircle className="h-4 w-4" />}
          {active ? 'Ativo' : 'Parado'}
        </Badge>
      </div>

      <div className="relative grid grid-cols-2 gap-4 px-5 py-4 text-sm text-muted-foreground">
        <InfoRow icon={Cpu} label="Provider" value={config.provider} />
        <InfoRow icon={Timer} label="Intervalo" value={`${config.intervalSeconds}s`} />
        <InfoRow icon={Clock3} label="Janela" value={`${config.windowStart} - ${config.windowEnd}`} />
        <InfoRow icon={Folder} label="Pasta" value={config.folder || '—'} />
        <InfoRow icon={Clock3} label="Último processamento" value={lastRun ? formatTime(lastRun) : '—'} />
        <InfoRow icon={Clock3} label="Fila" value={queue ?? 0} />
        <InfoRow icon={Timer} label="Timeout" value={config.timeoutSeconds ? `${config.timeoutSeconds}s` : 'Sem limite'} />
        {config.model && <InfoRow icon={Cpu} label="Modelo" value={config.model} />}
        {nextRetry && <InfoRow icon={Clock3} label="Próximo retry" value={formatTime(nextRetry)} />}
      </div>
    </Card>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Cpu; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/40 px-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
      <div className="flex flex-col">
        <span className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{label}</span>
        <span className="text-foreground font-medium">{value}</span>
      </div>
    </div>
  )
}

function formatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}
