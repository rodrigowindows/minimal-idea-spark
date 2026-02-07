import { useState } from 'react'
import { VersionTimeline } from '@/components/VersionHistory/Timeline'
import { DiffViewer } from '@/components/VersionHistory/DiffViewer'
import { getStoredSnapshots } from '@/lib/versioning/manager'

export function VersionHistoryPage() {
  const [entityType, setEntityType] = useState('journal')
  const [entityId] = useState('default')
  const [selected, setSelected] = useState<{ old: string; new: string } | null>(null)

  const snapshots = getStoredSnapshots(entityType, entityId)

  const handleRestore = (snap: { content: string }) => {
    setSelected({ old: snapshots[0]?.content ?? '', new: snap.content })
  }

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Version history</h1>
        <p className="text-muted-foreground">View and restore previous versions.</p>
      </header>
      <div className="grid gap-6 md:grid-cols-2">
        <VersionTimeline snapshots={snapshots} onRestore={handleRestore} />
        {selected && (
          <DiffViewer oldContent={selected.old} newContent={selected.new} />
        )}
      </div>
    </div>
  )
}
