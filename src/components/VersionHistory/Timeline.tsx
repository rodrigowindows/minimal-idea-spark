import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { History, RotateCcw } from 'lucide-react'
import { format } from 'date-fns'
import type { VersionSnapshot } from '@/lib/versioning/manager'

interface TimelineProps {
  snapshots: VersionSnapshot[]
  onRestore?: (snap: VersionSnapshot) => void
}

export function VersionTimeline({ snapshots, onRestore }: TimelineProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="h-5 w-5" />
          Version history
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[320px]">
          <ul className="space-y-3">
            {snapshots.length === 0 ? (
              <li className="text-sm text-muted-foreground py-4">No versions yet.</li>
            ) : (
              snapshots.map((s) => (
                <li key={s.id} className="flex items-start justify-between gap-2 rounded-lg border p-3">
                  <div>
                    <p className="text-xs text-muted-foreground">{format(new Date(s.createdAt), 'PPp')}</p>
                    {s.comment && <p className="text-sm mt-1">{s.comment}</p>}
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 font-mono">{s.content.slice(0, 120)}…</p>
                  </div>
                  {onRestore && (
                    <Button variant="outline" size="sm" onClick={() => onRestore(s)}>
                      <RotateCcw className="h-3 w-3 mr-1" /> Restore
                    </Button>
                  )}
                </li>
              ))
            )}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
