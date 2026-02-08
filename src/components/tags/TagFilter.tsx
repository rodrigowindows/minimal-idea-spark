import { useMemo } from 'react'
import { getAllTags, getTagCounts } from '@/lib/tags/tag-service'
import { cn } from '@/lib/utils'

interface TagFilterProps {
  selectedTagId: string | null
  onSelectTag: (tagId: string | null) => void
  className?: string
}

export function TagFilter({ selectedTagId, onSelectTag, className }: TagFilterProps) {
  const tags = useMemo(() => getAllTags(), [])
  const counts = useMemo(() => getTagCounts(), [])

  if (tags.length === 0) return null

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <button
        type="button"
        onClick={() => onSelectTag(null)}
        className={cn(
          'rounded-full px-3 py-1 text-sm font-medium transition-colors',
          selectedTagId === null
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
        )}
      >
        All
      </button>
      {tags.map((tag) => (
        <button
          key={tag.id}
          type="button"
          onClick={() => onSelectTag(selectedTagId === tag.id ? null : tag.id)}
          className={cn(
            'rounded-full px-3 py-1 text-sm font-medium transition-colors',
            selectedTagId === tag.id ? 'ring-2 ring-offset-2 ring-offset-background' : ''
          )}
          style={
            selectedTagId === tag.id
              ? { backgroundColor: tag.color, color: '#fff', ringColor: tag.color }
              : { backgroundColor: `${tag.color}20`, color: tag.color }
          }
        >
          {tag.name}
          {counts[tag.id] != null && (
            <span className="ml-1 opacity-80">({counts[tag.id]})</span>
          )}
        </button>
      ))}
    </div>
  )
}
