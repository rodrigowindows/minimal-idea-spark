import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Tag } from '@/lib/tags/tag-service'

interface TagBadgeProps {
  tag: Tag
  onRemove?: () => void
  className?: string
}

export function TagBadge({ tag, onRemove, className }: TagBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white',
        className
      )}
      style={{ backgroundColor: tag.color }}
    >
      {tag.name}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove() }}
          className="rounded-full p-0.5 hover:bg-white/20"
          aria-label={`Remove ${tag.name}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  )
}
