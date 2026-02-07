import { useState, useCallback } from 'react'
import { VersionTimeline } from '@/components/VersionHistory/Timeline'
import { DiffViewer } from '@/components/VersionHistory/DiffViewer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  getStoredSnapshots,
  getBranches,
  createSnapshot,
  createBranchFromSnapshot,
  exportHistoryAsJson,
  type VersionSnapshot,
} from '@/lib/versioning/manager'
import { Download } from 'lucide-react'

export function VersionHistoryPage() {
  const [entityType, setEntityType] = useState('journal')
  const [entityId] = useState('default')
  const [branch, setBranch] = useState<string>('main')
  const [selected, setSelected] = useState<{ old: string; new: string } | null>(null)
  const [newComment, setNewComment] = useState('')
  const [newContent, setNewContent] = useState('')
  const [key, setKey] = useState(0)

  const refresh = useCallback(() => setKey(k => k + 1), [])
  const snapshots = getStoredSnapshots(entityType, entityId, branch)
  const branches = getBranches(entityType, entityId)

  const handleRestore = (snap: { content: string }) => {
    setSelected({ old: snapshots[0]?.content ?? '', new: snap.content })
  }

  const handleCreateBranch = (snap: VersionSnapshot) => {
    const name = window.prompt('Branch name')
    if (name) createBranchFromSnapshot(snap.id, name) && refresh()
  }

  const handleExport = () => {
    const json = exportHistoryAsJson(snapshots)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `version-history-${entityType}-${entityId}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCreateSnapshot = () => {
    if (!newContent.trim()) return
    createSnapshot(entityType, entityId, newContent, newComment.trim() || undefined, branch)
    setNewContent('')
    setNewComment('')
    refresh()
  }

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Version history</h1>
          <p className="text-muted-foreground">View and restore previous versions. Branches and comments.</p>
        </div>
        <div className="flex gap-2">
          <Select value={branch} onValueChange={setBranch}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Branch" /></SelectTrigger>
            <SelectContent>
              {branches.map(b => (<SelectItem key={b} value={b}>{b}</SelectItem>))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" /> Export
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Create snapshot (with comment)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <Label>Content</Label>
            <Input value={newContent} onChange={e => setNewContent(e.target.value)} placeholder="Content to snapshot" />
          </div>
          <div>
            <Label>Comment (optional)</Label>
            <Input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="What changed?" />
          </div>
          <Button onClick={handleCreateSnapshot} disabled={!newContent.trim()}>Create snapshot</Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <VersionTimeline key={key} snapshots={snapshots} onRestore={handleRestore} onCreateBranch={handleCreateBranch} />
        {selected && <DiffViewer oldContent={selected.old} newContent={selected.new} />}
      </div>
    </div>
  )
}
