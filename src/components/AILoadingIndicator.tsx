import { Loader2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AILoadingIndicatorProps {
  className?: string
  compact?: boolean
}

export function AILoadingIndicator({ className, compact }: AILoadingIndicatorProps) {
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 text-muted-foreground', className)}
      role="status"
      aria-label="Processando com IA"
    >
      <Sparkles className={cn('text-primary', compact ? 'h-3.5 w-3.5' : 'h-4 w-4')} aria-hidden />
      <Loader2
        className={cn('animate-spin text-primary', compact ? 'h-3.5 w-3.5' : 'h-4 w-4')}
        aria-hidden
      />
      {!compact && <span className="text-xs">Processando...</span>}
    </span>
  )
}
