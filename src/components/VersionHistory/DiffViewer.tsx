import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { computeDiff, getDiffStats, type DiffLine } from '@/lib/versioning/manager'
import { Columns2, List, Plus, Minus, Equal } from 'lucide-react'

interface DiffViewerProps {
  oldContent: string
  newContent: string
  oldLabel?: string
  newLabel?: string
  className?: string
}

export function DiffViewer({ oldContent, newContent, oldLabel, newLabel, className }: DiffViewerProps) {
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified')
  const diff = useMemo(() => computeDiff(oldContent, newContent), [oldContent, newContent])
  const stats = useMemo(() => getDiffStats(diff), [diff])

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">Diff</CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs">
              <Badge variant="outline" className="gap-1 text-green-600 border-green-300">
                <Plus className="h-3 w-3" /> {stats.additions}
              </Badge>
              <Badge variant="outline" className="gap-1 text-red-600 border-red-300">
                <Minus className="h-3 w-3" /> {stats.deletions}
              </Badge>
              <Badge variant="outline" className="gap-1 text-muted-foreground">
                <Equal className="h-3 w-3" /> {stats.unchanged}
              </Badge>
            </div>
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'unified' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2"
                onClick={() => setViewMode('unified')}
              >
                <List className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={viewMode === 'split' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2"
                onClick={() => setViewMode('split')}
              >
                <Columns2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
        {(oldLabel || newLabel) && (
          <div className="flex gap-4 text-xs text-muted-foreground mt-1">
            {oldLabel && <span className="text-red-500">- {oldLabel}</span>}
            {newLabel && <span className="text-green-500">+ {newLabel}</span>}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {diff.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No differences found.</p>
        ) : viewMode === 'unified' ? (
          <UnifiedView diff={diff} />
        ) : (
          <SplitView diff={diff} />
        )}
      </CardContent>
    </Card>
  )
}

function UnifiedView({ diff }: { diff: DiffLine[] }) {
  return (
    <ScrollArea className="max-h-[400px]">
      <pre className="rounded-lg border bg-muted/30 p-3 text-xs overflow-x-auto font-mono">
        {diff.map((seg, i) => (
          <div
            key={i}
            className={cn(
              'px-2 py-0.5 flex',
              seg.type === 'add' && 'bg-green-500/15 text-green-800 dark:text-green-200',
              seg.type === 'remove' && 'bg-red-500/15 text-red-800 dark:text-red-200',
              seg.type === 'same' && 'text-muted-foreground'
            )}
          >
            <span className="w-8 text-right mr-3 opacity-50 select-none shrink-0">
              {seg.lineNum?.old ?? ''}
            </span>
            <span className="w-8 text-right mr-3 opacity-50 select-none shrink-0">
              {seg.lineNum?.new ?? ''}
            </span>
            <span className="w-4 shrink-0 select-none font-bold">
              {seg.type === 'add' ? '+' : seg.type === 'remove' ? '-' : ' '}
            </span>
            <span className="flex-1 whitespace-pre-wrap break-all">
              {seg.text || ' '}
            </span>
          </div>
        ))}
      </pre>
    </ScrollArea>
  )
}

function SplitView({ diff }: { diff: DiffLine[] }) {
  const { leftLines, rightLines } = useMemo(() => {
    const left: (DiffLine | null)[] = []
    const right: (DiffLine | null)[] = []

    let i = 0
    while (i < diff.length) {
      const line = diff[i]
      if (line.type === 'same') {
        left.push(line)
        right.push(line)
        i++
      } else if (line.type === 'remove') {
        // Collect consecutive removes
        const removes: DiffLine[] = []
        while (i < diff.length && diff[i].type === 'remove') {
          removes.push(diff[i])
          i++
        }
        // Collect consecutive adds
        const adds: DiffLine[] = []
        while (i < diff.length && diff[i].type === 'add') {
          adds.push(diff[i])
          i++
        }
        const maxLen = Math.max(removes.length, adds.length)
        for (let k = 0; k < maxLen; k++) {
          left.push(k < removes.length ? removes[k] : null)
          right.push(k < adds.length ? adds[k] : null)
        }
      } else if (line.type === 'add') {
        left.push(null)
        right.push(line)
        i++
      }
    }

    return { leftLines: left, rightLines: right }
  }, [diff])

  return (
    <ScrollArea className="max-h-[400px]">
      <div className="grid grid-cols-2 gap-0 rounded-lg border overflow-hidden text-xs font-mono">
        {/* Left panel header */}
        <div className="bg-red-500/10 border-b px-2 py-1 font-semibold text-red-600 dark:text-red-400">
          Old
        </div>
        <div className="bg-green-500/10 border-b border-l px-2 py-1 font-semibold text-green-600 dark:text-green-400">
          New
        </div>

        {leftLines.map((leftLine, idx) => {
          const rightLine = rightLines[idx]
          return (
            <SplitRow key={idx} left={leftLine} right={rightLine} />
          )
        })}
      </div>
    </ScrollArea>
  )
}

function SplitRow({ left, right }: { left: DiffLine | null; right: DiffLine | null }) {
  return (
    <>
      <div
        className={cn(
          'px-2 py-0.5 border-b min-h-[1.5em] flex',
          left?.type === 'remove' && 'bg-red-500/15 text-red-800 dark:text-red-200',
          left?.type === 'same' && 'text-muted-foreground',
          !left && 'bg-muted/20'
        )}
      >
        <span className="w-6 text-right mr-2 opacity-40 select-none shrink-0">
          {left?.lineNum?.old ?? ''}
        </span>
        <span className="flex-1 whitespace-pre-wrap break-all">
          {left?.text ?? ''}
        </span>
      </div>
      <div
        className={cn(
          'px-2 py-0.5 border-b border-l min-h-[1.5em] flex',
          right?.type === 'add' && 'bg-green-500/15 text-green-800 dark:text-green-200',
          right?.type === 'same' && 'text-muted-foreground',
          !right && 'bg-muted/20'
        )}
      >
        <span className="w-6 text-right mr-2 opacity-40 select-none shrink-0">
          {right?.lineNum?.new ?? ''}
        </span>
        <span className="flex-1 whitespace-pre-wrap break-all">
          {right?.text ?? ''}
        </span>
      </div>
    </>
  )
}
