import { Loader2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AILoadingIndicatorProps {
  className?: string
  compact?: boolean
  label?: string
  size?: 'sm' | 'md' | 'lg'
}

export function AILoadingIndicator({
  className,
  compact,
  label,
  size = 'md',
}: AILoadingIndicatorProps) {
  const iconSize =
    size === 'lg' ? 'h-5 w-5' : size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'
  const textSize =
    size === 'lg' ? 'text-sm' : size === 'sm' ? 'text-[11px]' : 'text-xs'

  const showLabel = !compact
  const displayLabel = label ?? 'Usando AI...'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-primary',
        compact && 'bg-transparent px-0 py-0',
        className,
      )}
      role="status"
      aria-label={displayLabel}
    >
      <Sparkles className={cn(iconSize, 'shrink-0')} aria-hidden="true" />
      <Loader2 className={cn(iconSize, 'shrink-0 animate-spin')} aria-hidden="true" />
      {showLabel && <span className={cn(textSize, 'font-medium')}>{displayLabel}</span>}
    </span>
  )
}
