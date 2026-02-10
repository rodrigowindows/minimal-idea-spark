import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle2, Clock3 } from 'lucide-react'
import type { PromptStatus } from '@/types/night-worker'
import { cn } from '@/lib/utils'

interface Props {
  status: PromptStatus
  className?: string
  pulse?: boolean
}

const STATUS_MAP: Record<PromptStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  pending: { label: 'Pendente', icon: Clock3, className: 'border-amber-500/40 bg-amber-500/10 text-amber-200' },
  done: { label: 'Concluído', icon: CheckCircle2, className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' },
  failed: { label: 'Falhou', icon: AlertCircle, className: 'border-red-500/40 bg-red-500/10 text-red-200' },
}

export function StatusBadge({ status, className, pulse }: Props) {
  const meta = STATUS_MAP[status] ?? STATUS_MAP.pending
  const Icon = meta.icon
  return (
    <Badge
      variant="outline"
      className={cn(
        'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize',
        meta.className,
        pulse && status === 'pending' && 'animate-pulse',
        className
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {meta.label}
    </Badge>
  )
}
