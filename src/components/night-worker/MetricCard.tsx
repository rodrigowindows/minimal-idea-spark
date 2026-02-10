import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string | number
  hint?: string
  icon: LucideIcon
  accent?: 'blue' | 'green' | 'red' | 'yellow' | 'purple'
  subtle?: boolean
}

const ACCENT_MAP: Record<NonNullable<MetricCardProps['accent']>, string> = {
  blue: 'from-blue-500/30 via-blue-500/10 to-transparent border-blue-500/40',
  green: 'from-emerald-500/30 via-emerald-500/10 to-transparent border-emerald-500/40',
  red: 'from-red-500/30 via-red-500/10 to-transparent border-red-500/40',
  yellow: 'from-amber-500/30 via-amber-500/10 to-transparent border-amber-500/40',
  purple: 'from-purple-500/30 via-purple-500/10 to-transparent border-purple-500/40',
}

export function MetricCard({ title, value, hint, icon: Icon, accent = 'blue', subtle }: MetricCardProps) {
  return (
    <Card className={cn(
      'relative overflow-hidden border bg-gradient-to-b from-background/60 to-background/20 backdrop-blur-sm',
      'hover:border-white/10 transition-colors duration-300',
      'min-h-[132px]',
      `border-${accent}-500/40`
    )}>
      <div className={cn(
        'absolute inset-0 opacity-70 pointer-events-none',
        `bg-gradient-to-br ${ACCENT_MAP[accent]}`
      )} aria-hidden />
      <div className="relative flex items-start justify-between p-5">
        <div className="space-y-1">
          <p className="text-sm uppercase tracking-[0.08em] text-muted-foreground font-semibold">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className={cn(
          'flex h-11 w-11 items-center justify-center rounded-xl border bg-background/50',
          subtle ? 'border-border/60' : 'border-white/15'
        )}>
          <Icon className="h-5 w-5 text-white/90" aria-hidden />
        </div>
      </div>
    </Card>
  )
}
