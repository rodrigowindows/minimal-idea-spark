import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  History,
  RotateCcw,
  GitBranch,
  MessageSquare,
  Tag,
  Trash2,
  GitMerge,
  ChevronDown,
  ChevronRight,
  Circle,
  CheckCircle2,
} from 'lucide-react'
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns'
import type { VersionSnapshot } from '@/lib/versioning/manager'
import { updateSnapshotComment, addTagToSnapshot, removeTagFromSnapshot } from '@/lib/versioning/manager'
import { cn } from '@/lib/utils'

interface TimelineProps {
  snapshots: VersionSnapshot[]
  selectedId?: string | null
  compareIds?: [string, string] | null
  onSelect?: (snap: VersionSnapshot) => void
  onRestore?: (snap: VersionSnapshot) => void
  onCreateBranch?: (snap: VersionSnapshot) => void
  onDelete?: (snap: VersionSnapshot) => void
  onCompare?: (snap: VersionSnapshot) => void
  onRefresh?: () => void
}

function groupByDate(snapshots: VersionSnapshot[]): Map<string, VersionSnapshot[]> {
  const groups = new Map<string, VersionSnapshot[]>()
  for (const snap of snapshots) {
    const d = new Date(snap.createdAt)
    let label: string
    if (isToday(d)) label = 'Today'
    else if (isYesterday(d)) label = 'Yesterday'
    else label = format(d, 'MMM dd, yyyy')
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label)!.push(snap)
  }
  return groups
}

export function VersionTimeline({
  snapshots,
  selectedId,
  compareIds,
  onSelect,
  onRestore,
  onCreateBranch,
  onDelete,
  onCompare,
  onRefresh,
}: TimelineProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['Today', 'Yesterday']))
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editComment, setEditComment] = useState('')
  const [addingTag, setAddingTag] = useState<string | null>(null)
  const [newTag, setNewTag] = useState('')

  const groups = groupByDate(snapshots)

  // Auto-expand first group if nothing expanded
  if (expandedGroups.size === 0 && groups.size > 0) {
    const firstKey = groups.keys().next().value
    if (firstKey) expandedGroups.add(firstKey)
  }

  const toggleGroup = (label: string) => {
    const next = new Set(expandedGroups)
    if (next.has(label)) next.delete(label)
    else next.add(label)
    setExpandedGroups(next)
  }

  const handleSaveComment = (snapId: string) => {
    updateSnapshotComment(snapId, editComment)
    setEditingComment(null)
    setEditComment('')
    onRefresh?.()
  }

  const handleAddTag = (snapId: string) => {
    if (newTag.trim()) {
      addTagToSnapshot(snapId, newTag.trim())
      setAddingTag(null)
      setNewTag('')
      onRefresh?.()
    }
  }

  const handleRemoveTag = (snapId: string, tag: string) => {
    removeTagFromSnapshot(snapId, tag)
    onRefresh?.()
  }

  const isCompareLeft = (id: string) => compareIds?.[0] === id
  const isCompareRight = (id: string) => compareIds?.[1] === id

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="h-5 w-5" />
          Version Timeline
          <Badge variant="secondary" className="ml-auto text-xs">{snapshots.length} versions</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[500px] pr-2">
          {snapshots.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              <History className="h-8 w-8 mx-auto mb-2 opacity-30" />
              No versions yet. Create a snapshot to start tracking.
            </div>
          ) : (
            <div className="space-y-4">
              {Array.from(groups.entries()).map(([dateLabel, group]) => (
                <div key={dateLabel}>
                  <button
                    className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 hover:text-foreground transition-colors"
                    onClick={() => toggleGroup(dateLabel)}
                  >
                    {expandedGroups.has(dateLabel) ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                    {dateLabel}
                    <Badge variant="outline" className="text-[10px] h-4 px-1 ml-1">{group.length}</Badge>
                  </button>

                  {expandedGroups.has(dateLabel) && (
                    <div className="relative ml-3 border-l-2 border-muted pl-4 space-y-3">
                      {group.map((snap, idx) => {
                        const isSelected = selectedId === snap.id
                        const isLeft = isCompareLeft(snap.id)
                        const isRight = isCompareRight(snap.id)
                        return (
                          <div
                            key={snap.id}
                            className={cn(
                              'relative rounded-lg border p-3 transition-all cursor-pointer hover:shadow-sm',
                              isSelected && 'border-primary bg-primary/5 shadow-sm',
                              isLeft && 'border-red-400 bg-red-500/5',
                              isRight && 'border-green-400 bg-green-500/5',
                              !isSelected && !isLeft && !isRight && 'hover:bg-muted/40'
                            )}
                            onClick={() => onSelect?.(snap)}
                          >
                            {/* Timeline dot */}
                            <div className={cn(
                              'absolute -left-[1.35rem] top-4 h-2.5 w-2.5 rounded-full border-2 border-background',
                              idx === 0 && dateLabel === Array.from(groups.keys())[0]
                                ? 'bg-primary'
                                : 'bg-muted-foreground/40'
                            )} />

                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                {/* Time + branch */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <p className="text-xs text-muted-foreground">
                                        {format(new Date(snap.createdAt), 'HH:mm:ss')}
                                      </p>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {format(new Date(snap.createdAt), 'PPpp')}
                                      <br />
                                      {formatDistanceToNow(new Date(snap.createdAt), { addSuffix: true })}
                                    </TooltipContent>
                                  </Tooltip>

                                  {snap.branch !== 'main' && (
                                    <Badge variant="outline" className="text-[10px] h-4 gap-0.5">
                                      <GitBranch className="h-2.5 w-2.5" />{snap.branch}
                                    </Badge>
                                  )}

                                  {snap.parentId && idx === 0 && (
                                    <Badge variant="secondary" className="text-[10px] h-4">Latest</Badge>
                                  )}

                                  {isLeft && <Badge className="text-[10px] h-4 bg-red-500">A</Badge>}
                                  {isRight && <Badge className="text-[10px] h-4 bg-green-500">B</Badge>}
                                </div>

                                {/* Comment */}
                                {editingComment === snap.id ? (
                                  <div className="flex gap-1 mt-1" onClick={e => e.stopPropagation()}>
                                    <Input
                                      value={editComment}
                                      onChange={e => setEditComment(e.target.value)}
                                      className="h-7 text-xs"
                                      placeholder="Add comment..."
                                      onKeyDown={e => e.key === 'Enter' && handleSaveComment(snap.id)}
                                      autoFocus
                                    />
                                    <Button size="sm" className="h-7 text-xs" onClick={() => handleSaveComment(snap.id)}>
                                      Save
                                    </Button>
                                  </div>
                                ) : (
                                  snap.comment && (
                                    <p className="text-sm mt-1 font-medium">{snap.comment}</p>
                                  )
                                )}

                                {/* Tags */}
                                {snap.tags.length > 0 && (
                                  <div className="flex gap-1 mt-1 flex-wrap" onClick={e => e.stopPropagation()}>
                                    {snap.tags.map(tag => (
                                      <Badge key={tag} variant="secondary" className="text-[10px] h-4 gap-0.5 cursor-pointer hover:bg-destructive/20" onClick={() => handleRemoveTag(snap.id, tag)}>
                                        <Tag className="h-2 w-2" />{tag}
                                      </Badge>
                                    ))}
                                  </div>
                                )}

                                {addingTag === snap.id && (
                                  <div className="flex gap-1 mt-1" onClick={e => e.stopPropagation()}>
                                    <Input
                                      value={newTag}
                                      onChange={e => setNewTag(e.target.value)}
                                      className="h-7 text-xs w-32"
                                      placeholder="Tag name..."
                                      onKeyDown={e => e.key === 'Enter' && handleAddTag(snap.id)}
                                      autoFocus
                                    />
                                    <Button size="sm" className="h-7 text-xs" onClick={() => handleAddTag(snap.id)}>Add</Button>
                                  </div>
                                )}

                                {/* Content preview */}
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 font-mono">
                                  {snap.content.slice(0, 150)}{snap.content.length > 150 ? '...' : ''}
                                </p>
                              </div>

                              {/* Action buttons */}
                              <div className="flex flex-col gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                                {onCompare && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onCompare(snap)}>
                                        <GitMerge className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Compare</TooltipContent>
                                  </Tooltip>
                                )}

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={() => {
                                        setEditingComment(snap.id)
                                        setEditComment(snap.comment ?? '')
                                      }}
                                    >
                                      <MessageSquare className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Edit comment</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={() => {
                                        setAddingTag(addingTag === snap.id ? null : snap.id)
                                        setNewTag('')
                                      }}
                                    >
                                      <Tag className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Add tag</TooltipContent>
                                </Tooltip>

                                {onCreateBranch && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onCreateBranch(snap)}>
                                        <GitBranch className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Create branch</TooltipContent>
                                  </Tooltip>
                                )}

                                {onRestore && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => onRestore(snap)}>
                                        <RotateCcw className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Restore this version</TooltipContent>
                                  </Tooltip>
                                )}

                                {onDelete && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => onDelete(snap)}>
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Delete</TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
