import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FileText,
  AlertTriangle,
  Link2,
  Tag,
  ChevronDown,
  ChevronUp,
  Eye,
} from 'lucide-react'
import type { ImportedItem, ImportTargetType } from '@/lib/import/types'

interface ExternalImportPreviewProps {
  items: ImportedItem[]
  onItemsChange: (items: ImportedItem[]) => void
  onConfirm: () => void
  onCancel: () => void
  importing: boolean
}

export function ExternalImportPreview({
  items,
  onItemsChange,
  onConfirm,
  onCancel,
  importing,
}: ExternalImportPreviewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const activeItems = items.filter((i) => !i.skipped)
  const duplicateCount = items.filter((i) => i.isDuplicate).length
  const skippedCount = items.filter((i) => i.skipped).length

  const toggleSkip = (id: string) => {
    onItemsChange(
      items.map((item) =>
        item.id === id ? { ...item, skipped: !item.skipped } : item
      )
    )
  }

  const changeTargetType = (id: string, targetType: ImportTargetType) => {
    onItemsChange(
      items.map((item) =>
        item.id === id ? { ...item, targetType } : item
      )
    )
  }

  const skipAllDuplicates = () => {
    onItemsChange(
      items.map((item) =>
        item.isDuplicate ? { ...item, skipped: true } : item
      )
    )
  }

  const selectAll = () => {
    onItemsChange(items.map((item) => ({ ...item, skipped: false })))
  }

  const deselectAll = () => {
    onItemsChange(items.map((item) => ({ ...item, skipped: true })))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Preview ({activeItems.length} of {items.length} items)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="secondary">{items.length} total</Badge>
          {duplicateCount > 0 && (
            <Badge variant="destructive">
              {duplicateCount} potential duplicates
            </Badge>
          )}
          {skippedCount > 0 && (
            <Badge variant="outline">{skippedCount} skipped</Badge>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>
            Select all
          </Button>
          <Button variant="outline" size="sm" onClick={deselectAll}>
            Deselect all
          </Button>
          {duplicateCount > 0 && (
            <Button variant="outline" size="sm" onClick={skipAllDuplicates}>
              Skip all duplicates
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[400px]">
          <div className="space-y-2 pr-4">
            {items.map((item) => (
              <div
                key={item.id}
                className={`rounded-lg border p-3 transition-colors ${
                  item.skipped
                    ? 'border-border/50 bg-muted/30 opacity-60'
                    : item.isDuplicate
                    ? 'border-destructive/30 bg-destructive/5'
                    : 'border-border'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={!item.skipped}
                    onCheckedChange={() => toggleSkip(item.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="font-medium truncate">{item.title}</span>
                      {item.isDuplicate && (
                        <span className="flex items-center gap-1 text-xs text-destructive">
                          <AlertTriangle className="h-3 w-3" />
                          Similar to: {item.duplicateOf}
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      {item.sourceFile && (
                        <span className="text-xs text-muted-foreground">
                          {item.sourceFile}
                        </span>
                      )}
                      {item.internalLinks && item.internalLinks.length > 0 && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Link2 className="h-3 w-3" />
                          {item.internalLinks.length} links
                        </span>
                      )}
                      {item.tags && item.tags.length > 0 && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Tag className="h-3 w-3" />
                          {item.tags.slice(0, 3).join(', ')}
                          {item.tags.length > 3 && ` +${item.tags.length - 3}`}
                        </span>
                      )}
                    </div>

                    {item.content && (
                      <button
                        type="button"
                        className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() =>
                          setExpandedId(expandedId === item.id ? null : item.id)
                        }
                      >
                        {expandedId === item.id ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                        {expandedId === item.id ? 'Hide' : 'Preview'}
                      </button>
                    )}
                    {expandedId === item.id && item.content && (
                      <div className="mt-2 rounded bg-muted/50 p-2 text-xs whitespace-pre-wrap max-h-32 overflow-y-auto">
                        {item.content.slice(0, 500)}
                        {item.content.length > 500 && '...'}
                      </div>
                    )}
                  </div>

                  <Select
                    value={item.targetType}
                    onValueChange={(v) =>
                      changeTargetType(item.id, v as ImportTargetType)
                    }
                  >
                    <SelectTrigger className="w-[130px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="opportunity">Opportunity</SelectItem>
                      <SelectItem value="journal">Journal</SelectItem>
                      <SelectItem value="knowledge">Knowledge</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex gap-2 pt-2">
          <Button onClick={onConfirm} disabled={importing || activeItems.length === 0}>
            {importing
              ? 'Importing...'
              : `Import ${activeItems.length} item${activeItems.length !== 1 ? 's' : ''}`}
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={importing}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
