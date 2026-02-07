import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface DiffViewerProps {
  oldContent: string
  newContent: string
  className?: string
}

function simpleDiff(oldStr: string, newStr: string): { type: 'add' | 'remove' | 'same'; text: string }[] {
  const oldLines = oldStr.split('\n')
  const newLines = newStr.split('\n')
  const result: { type: 'add' | 'remove' | 'same'; text: string }[] = []
  let i = 0
  let j = 0
  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      result.push({ type: 'same', text: oldLines[i] })
      i++
      j++
    } else if (j < newLines.length && (i >= oldLines.length || !oldLines.slice(i).includes(newLines[j]))) {
      result.push({ type: 'add', text: newLines[j] })
      j++
    } else if (i < oldLines.length) {
      result.push({ type: 'remove', text: oldLines[i] })
      i++
    } else {
      j++
    }
  }
  return result
}

export function DiffViewer({ oldContent, newContent, className }: DiffViewerProps) {
  const segments = useMemo(() => simpleDiff(oldContent, newContent), [oldContent, newContent])

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Diff</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="rounded-lg border bg-muted/30 p-3 text-xs overflow-x-auto">
          {segments.map((seg, i) => (
            <div
              key={i}
              className={cn(
                seg.type === 'add' && 'bg-green-500/20 text-green-800 dark:text-green-200',
                seg.type === 'remove' && 'bg-red-500/20 text-red-800 dark:text-red-200',
                seg.type === 'same' && 'text-muted-foreground'
              )}
            >
              {seg.type === 'add' && '+'}
              {seg.type === 'remove' && '-'}
              {seg.text || ' '}
            </div>
          ))}
        </pre>
      </CardContent>
    </Card>
  )
}
