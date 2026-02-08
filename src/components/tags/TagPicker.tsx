import { useState, useRef, useEffect } from 'react'
import { Check, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { TagBadge } from './TagBadge'
import {
  getAllTags,
  createTag,
  type Tag,
} from '@/lib/tags/tag-service'
import { cn } from '@/lib/utils'

interface TagPickerProps {
  selectedTagIds: string[]
  onChange: (tagIds: string[]) => void
  placeholder?: string
  className?: string
}

export function TagPicker({ selectedTagIds, onChange, placeholder = 'Add tags...', className }: TagPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [tags, setTags] = useState<Tag[]>(getAllTags())
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTags(getAllTags())
  }, [open])

  const selectedTags = tags.filter((t) => selectedTagIds.includes(t.id))
  const filtered = query.trim()
    ? tags.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()))
    : tags

  const handleSelect = (tag: Tag) => {
    const next = selectedTagIds.includes(tag.id)
      ? selectedTagIds.filter((id) => id !== tag.id)
      : [...selectedTagIds, tag.id]
    onChange(next)
  }

  const handleCreate = () => {
    if (!query.trim()) return
    const tag = createTag(query.trim())
    setTags(getAllTags())
    onChange([...selectedTagIds, tag.id])
    setQuery('')
    inputRef.current?.focus()
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn('min-h-9 justify-start gap-2 font-normal', className)}
        >
          <Plus className="h-4 w-4 shrink-0" />
          {selectedTags.length > 0 ? (
            <span className="flex flex-wrap gap-1">
              {selectedTags.map((t) => (
                <TagBadge key={t.id} tag={t} />
              ))}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search or create..."
          className="mb-2 h-8"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              const existing = tags.find((t) => t.name.toLowerCase() === query.trim().toLowerCase())
              if (existing) handleSelect(existing)
              else handleCreate()
            }
          }}
        />
        <div className="max-h-48 overflow-y-auto space-y-0.5">
          {filtered.map((tag) => (
            <button
              key={tag.id}
              type="button"
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent',
                selectedTagIds.includes(tag.id) && 'bg-accent'
              )}
              onClick={() => handleSelect(tag)}
            >
              {selectedTagIds.includes(tag.id) ? (
                <Check className="h-4 w-4 shrink-0 text-primary" />
              ) : (
                <span className="h-4 w-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: tag.color }} />
              )}
              <span>{tag.name}</span>
            </button>
          ))}
          {query.trim() && !tags.some((t) => t.name.toLowerCase() === query.trim().toLowerCase()) && (
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={handleCreate}
            >
              <Plus className="h-4 w-4" />
              Create "{query.trim()}"
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
