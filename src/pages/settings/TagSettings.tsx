import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Tag, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { createTag, deleteTag, getAllTags } from '@/lib/tags/tag-service'
import { TagBadge } from '@/components/tags/TagBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function TagSettings() {
  const [tags, setTags] = useState(() => getAllTags())

  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            Tags
          </span>
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => {
              const name = window.prompt('Tag name')
              if (!name?.trim()) return
              createTag(name.trim())
              setTags(getAllTags())
              toast.success('Tag created')
            }}
          >
            <Plus className="h-3 w-3" />
            Add
          </Button>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Manage tags for opportunities and journal. Use in Opportunities to filter.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {tags.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No tags yet. Create one or add from an opportunity.
          </p>
        ) : (
          tags.map((tag) => (
            <div key={tag.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-2">
              <TagBadge tag={tag} />
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-destructive hover:text-destructive"
                onClick={() => {
                  if (!window.confirm(`Delete tag "${tag.name}"?`)) return
                  deleteTag(tag.id)
                  setTags(getAllTags())
                  toast.success('Tag deleted')
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
        <Button variant="link" className="px-0 text-sm" asChild>
          <Link to="/import">Import from Markdown/CSV</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

