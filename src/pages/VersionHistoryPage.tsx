import { useState, useCallback, useMemo, useRef } from 'react'
import { VersionTimeline } from '@/components/VersionHistory/Timeline'
import { DiffViewer } from '@/components/VersionHistory/DiffViewer'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  getStoredSnapshots,
  getBranches,
  getBranchInfo,
  createSnapshot,
  createBranchFromSnapshot,
  deleteBranch,
  mergeBranch,
  restoreSnapshot,
  deleteSnapshot,
  searchSnapshots,
  getTrackedEntities,
  exportFullHistory,
  importHistory,
  type VersionSnapshot,
} from '@/lib/versioning/manager'
import { ENTITY_TYPES, ENTITY_TYPE_LABELS, type EntityType } from '@/lib/db/schema-versions'
import {
  Download,
  Upload,
  Search,
  GitBranch,
  GitMerge,
  History,
  Plus,
  Trash2,
  RotateCcw,
  FileText,
  Package,
  AlertCircle,
  ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

export function VersionHistoryPage() {
  // State
  const [entityType, setEntityType] = useState<string>('journal')
  const [entityId, setEntityId] = useState<string>('default')
  const [branch, setBranch] = useState<string>('main')
  const [key, setKey] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('timeline')

  // Compare state
  const [compareMode, setCompareMode] = useState(false)
  const [compareA, setCompareA] = useState<VersionSnapshot | null>(null)
  const [compareB, setCompareB] = useState<VersionSnapshot | null>(null)

  // Selected snapshot for detail
  const [selectedSnap, setSelectedSnap] = useState<VersionSnapshot | null>(null)

  // Create snapshot dialog
  const [showCreate, setShowCreate] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [newComment, setNewComment] = useState('')

  // Branch dialog
  const [showBranchDialog, setShowBranchDialog] = useState(false)
  const [branchSourceSnap, setBranchSourceSnap] = useState<VersionSnapshot | null>(null)
  const [newBranchName, setNewBranchName] = useState('')
  const [newBranchDesc, setNewBranchDesc] = useState('')

  // Merge dialog
  const [showMergeDialog, setShowMergeDialog] = useState(false)
  const [mergeFrom, setMergeFrom] = useState('')
  const [mergeTo, setMergeTo] = useState('main')

  // Import dialog
  const [showImport, setShowImport] = useState(false)
  const [importJson, setImportJson] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const refresh = useCallback(() => setKey(k => k + 1), [])

  // Data
  const snapshots = useMemo(
    () => getStoredSnapshots(entityType, entityId, branch),
    [entityType, entityId, branch, key]
  )
  const branches = useMemo(
    () => getBranches(entityType, entityId),
    [entityType, entityId, key]
  )
  const trackedEntities = useMemo(() => getTrackedEntities(), [key])
  const searchResults = useMemo(
    () => (searchQuery.trim() ? searchSnapshots(searchQuery, entityType !== 'all' ? entityType : undefined) : []),
    [searchQuery, entityType, key]
  )

  // Entity type filter options (add 'all' for search)
  const entityTypeOptions = ENTITY_TYPES.map(t => ({ value: t, label: ENTITY_TYPE_LABELS[t] }))

  // Handlers
  const handleCreateSnapshot = () => {
    if (!newContent.trim()) return
    createSnapshot(
      entityType as EntityType,
      entityId,
      newContent,
      newComment.trim() || undefined,
      branch
    )
    setNewContent('')
    setNewComment('')
    setShowCreate(false)
    refresh()
    toast.success('Snapshot created')
  }

  const handleRestore = (snap: VersionSnapshot) => {
    restoreSnapshot(snap.id)
    refresh()
    toast.success('Version restored')
  }

  const handleDelete = (snap: VersionSnapshot) => {
    deleteSnapshot(snap.id)
    if (selectedSnap?.id === snap.id) setSelectedSnap(null)
    if (compareA?.id === snap.id) setCompareA(null)
    if (compareB?.id === snap.id) setCompareB(null)
    refresh()
    toast.success('Snapshot deleted')
  }

  const handleSelect = (snap: VersionSnapshot) => {
    if (compareMode) {
      if (!compareA) {
        setCompareA(snap)
      } else if (!compareB && snap.id !== compareA.id) {
        setCompareB(snap)
      } else {
        // Reset and start over
        setCompareA(snap)
        setCompareB(null)
      }
    } else {
      setSelectedSnap(snap)
    }
  }

  const handleCompareToggle = (snap: VersionSnapshot) => {
    if (!compareMode) {
      setCompareMode(true)
      setCompareA(snap)
      setCompareB(null)
      setSelectedSnap(null)
    } else {
      if (!compareA) {
        setCompareA(snap)
      } else if (snap.id === compareA.id) {
        setCompareA(null)
      } else {
        setCompareB(snap)
      }
    }
  }

  const handleCreateBranch = (snap: VersionSnapshot) => {
    setBranchSourceSnap(snap)
    setNewBranchName('')
    setNewBranchDesc('')
    setShowBranchDialog(true)
  }

  const handleConfirmCreateBranch = () => {
    if (!branchSourceSnap || !newBranchName.trim()) return
    createBranchFromSnapshot(branchSourceSnap.id, newBranchName.trim(), newBranchDesc.trim() || undefined)
    setShowBranchDialog(false)
    setBranch(newBranchName.trim())
    refresh()
    toast.success(`Branch "${newBranchName.trim()}" created`)
  }

  const handleMergeBranch = () => {
    if (!mergeFrom || !mergeTo || mergeFrom === mergeTo) return
    const result = mergeBranch(entityType as EntityType, entityId, mergeFrom, mergeTo)
    if (result) {
      setShowMergeDialog(false)
      setBranch(mergeTo)
      refresh()
      toast.success(`Merged "${mergeFrom}" into "${mergeTo}"`)
    } else {
      toast.error('Merge failed - no snapshots in source branch')
    }
  }

  const handleDeleteBranch = (branchName: string) => {
    if (branchName === 'main') return
    deleteBranch(entityType, entityId, branchName)
    if (branch === branchName) setBranch('main')
    refresh()
    toast.success(`Branch "${branchName}" deleted`)
  }

  const handleExport = () => {
    const json = exportFullHistory(entityType as EntityType, entityId, branch)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `version-history-${entityType}-${entityId}-${branch}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('History exported')
  }

  const handleImport = () => {
    if (!importJson.trim()) return
    const result = importHistory(importJson)
    if (result.errors.length > 0) {
      toast.error(`Import errors: ${result.errors.join(', ')}`)
    } else {
      toast.success(`Imported ${result.imported} snapshots`)
    }
    setShowImport(false)
    setImportJson('')
    refresh()
  }

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const content = ev.target?.result as string
      setImportJson(content)
    }
    reader.readAsText(file)
  }

  const handleEntitySelect = (type: string, id: string) => {
    setEntityType(type)
    setEntityId(id)
    setBranch('main')
    setSelectedSnap(null)
    setCompareA(null)
    setCompareB(null)
    setCompareMode(false)
    setActiveTab('timeline')
  }

  const exitCompareMode = () => {
    setCompareMode(false)
    setCompareA(null)
    setCompareB(null)
  }

  const compareIds: [string, string] | null =
    compareA && compareB ? [compareA.id, compareB.id] : null

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <History className="h-6 w-6" />
            Version History
          </h1>
          <p className="text-muted-foreground text-sm">
            Track changes, compare versions, manage branches, and restore content.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> New Snapshot
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)} className="gap-1.5">
            <Upload className="h-4 w-4" /> Import
          </Button>
        </div>
      </header>

      {/* Entity & Branch Controls */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Entity Type</Label>
          <Select value={entityType} onValueChange={(v) => { setEntityType(v); setSelectedSnap(null); exitCompareMode() }}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {entityTypeOptions.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Entity ID</Label>
          <Input
            value={entityId}
            onChange={e => { setEntityId(e.target.value); setSelectedSnap(null); exitCompareMode() }}
            className="w-40"
            placeholder="e.g. default"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Branch</Label>
          <Select value={branch} onValueChange={setBranch}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {branches.map(b => (
                <SelectItem key={b} value={b}>
                  <span className="flex items-center gap-1.5">
                    <GitBranch className="h-3 w-3" /> {b}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {branches.length > 1 && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setMergeFrom(branches.find(b => b !== 'main') ?? '')
                setMergeTo('main')
                setShowMergeDialog(true)
              }}
              className="gap-1.5"
            >
              <GitMerge className="h-4 w-4" /> Merge
            </Button>
            {branch !== 'main' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeleteBranch(branch)}
                className="gap-1.5 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" /> Delete Branch
              </Button>
            )}
          </>
        )}

        {compareMode && (
          <div className="flex items-center gap-2 ml-auto">
            <Badge variant="secondary" className="gap-1">
              Compare mode
              {compareA && !compareB && ' - select version B'}
              {compareA && compareB && ' - viewing diff'}
            </Badge>
            <Button variant="ghost" size="sm" onClick={exitCompareMode}>
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="timeline" className="gap-1.5">
            <History className="h-3.5 w-3.5" /> Timeline
          </TabsTrigger>
          <TabsTrigger value="entities" className="gap-1.5">
            <Package className="h-3.5 w-3.5" /> Tracked Entities
          </TabsTrigger>
          <TabsTrigger value="search" className="gap-1.5">
            <Search className="h-3.5 w-3.5" /> Search
          </TabsTrigger>
          <TabsTrigger value="branches" className="gap-1.5">
            <GitBranch className="h-3.5 w-3.5" /> Branches
          </TabsTrigger>
        </TabsList>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <VersionTimeline
              key={key}
              snapshots={snapshots}
              selectedId={selectedSnap?.id}
              compareIds={compareIds}
              onSelect={handleSelect}
              onRestore={handleRestore}
              onCreateBranch={handleCreateBranch}
              onDelete={handleDelete}
              onCompare={handleCompareToggle}
              onRefresh={refresh}
            />

            <div className="space-y-4">
              {/* Compare view */}
              {compareMode && compareA && compareB && (
                <DiffViewer
                  oldContent={compareA.content}
                  newContent={compareB.content}
                  oldLabel={`${compareA.comment || compareA.id.slice(0, 12)} (${format(new Date(compareA.createdAt), 'MMM dd HH:mm')})`}
                  newLabel={`${compareB.comment || compareB.id.slice(0, 12)} (${format(new Date(compareB.createdAt), 'MMM dd HH:mm')})`}
                />
              )}

              {/* Selected snapshot detail */}
              {!compareMode && selectedSnap && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Snapshot Detail
                    </CardTitle>
                    <CardDescription>
                      {selectedSnap.comment || 'No comment'}
                      {' '}&middot;{' '}
                      {format(new Date(selectedSnap.createdAt), 'PPpp')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge variant="outline">{selectedSnap.entityType}</Badge>
                      <Badge variant="outline">
                        <GitBranch className="h-3 w-3 mr-1" />
                        {selectedSnap.branch}
                      </Badge>
                      <Badge variant="secondary">ID: {selectedSnap.id.slice(0, 12)}</Badge>
                      {selectedSnap.parentId && (
                        <Badge variant="secondary">Parent: {selectedSnap.parentId.slice(0, 12)}</Badge>
                      )}
                    </div>
                    {selectedSnap.tags.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {selectedSnap.tags.map(t => (
                          <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                        ))}
                      </div>
                    )}
                    <Separator />
                    <ScrollArea className="max-h-[300px]">
                      <pre className="text-xs font-mono bg-muted/40 rounded-lg p-3 whitespace-pre-wrap break-all">
                        {selectedSnap.content}
                      </pre>
                    </ScrollArea>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleRestore(selectedSnap)} className="gap-1">
                        <RotateCcw className="h-3.5 w-3.5" /> Restore
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleCompareToggle(selectedSnap)} className="gap-1">
                        <GitMerge className="h-3.5 w-3.5" /> Compare
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleCreateBranch(selectedSnap)} className="gap-1">
                        <GitBranch className="h-3.5 w-3.5" /> Branch
                      </Button>
                    </div>

                    {/* Show diff with previous if parent exists */}
                    {selectedSnap.parentId && (() => {
                      const parentIdx = snapshots.findIndex(s => s.id === selectedSnap.parentId)
                      if (parentIdx === -1) return null
                      const parent = snapshots[parentIdx]
                      return (
                        <DiffViewer
                          oldContent={parent.content}
                          newContent={selectedSnap.content}
                          oldLabel={`Previous (${parent.comment || parent.id.slice(0, 12)})`}
                          newLabel={`Current (${selectedSnap.comment || selectedSnap.id.slice(0, 12)})`}
                        />
                      )
                    })()}
                  </CardContent>
                </Card>
              )}

              {/* Empty state for right panel */}
              {!compareMode && !selectedSnap && snapshots.length > 0 && (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Select a snapshot to view details and diff</p>
                    <p className="text-xs mt-1">Or click the compare icon to compare two versions</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Tracked Entities Tab */}
        <TabsContent value="entities">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5" />
                Tracked Entities
              </CardTitle>
              <CardDescription>
                All entities with version history. Click to browse their versions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trackedEntities.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No tracked entities yet</p>
                  <p className="text-xs mt-1">Create a snapshot to start tracking.</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {trackedEntities.map(ent => (
                    <Card
                      key={`${ent.entityType}:${ent.entityId}`}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleEntitySelect(ent.entityType, ent.entityId)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">{ENTITY_TYPE_LABELS[ent.entityType]}</Badge>
                          <Badge variant="secondary">{ent.count} versions</Badge>
                        </div>
                        <p className="text-sm font-medium mt-2 truncate">{ent.entityId}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Last updated: {format(new Date(ent.lastUpdated), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Search Tab */}
        <TabsContent value="search">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search Snapshots
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search content, comments, tags..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
              </div>

              {searchQuery.trim() && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
                  </p>
                  <ScrollArea className="max-h-[500px]">
                    <div className="space-y-2">
                      {searchResults.map(snap => (
                        <Card
                          key={snap.id}
                          className="cursor-pointer hover:bg-muted/40 transition-colors"
                          onClick={() => {
                            handleEntitySelect(snap.entityType, snap.entityId)
                            setSelectedSnap(snap as unknown as VersionSnapshot)
                          }}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">{snap.entityType}</Badge>
                              <span className="text-xs text-muted-foreground">{snap.entityId}</span>
                              <Badge variant="secondary" className="text-xs gap-1">
                                <GitBranch className="h-2.5 w-2.5" />{snap.branch}
                              </Badge>
                              <span className="text-xs text-muted-foreground ml-auto">
                                {format(new Date(snap.createdAt), 'MMM dd, yyyy HH:mm')}
                              </span>
                            </div>
                            {snap.comment && (
                              <p className="text-sm mt-1 font-medium">{snap.comment}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 font-mono">
                              {snap.content.slice(0, 200)}
                            </p>
                            {snap.tags.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {snap.tags.map(t => (
                                  <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branches Tab */}
        <TabsContent value="branches">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                Branches
              </CardTitle>
              <CardDescription>
                Branches for {ENTITY_TYPE_LABELS[entityType as EntityType] ?? entityType} / {entityId}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {branches.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No branches</p>
              ) : (
                <div className="space-y-2">
                  {branches.map(b => {
                    const branchSnapshots = getStoredSnapshots(entityType, entityId, b)
                    const info = getBranchInfo(entityType, entityId).find(bi => bi.name === b)
                    return (
                      <Card key={b}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <GitBranch className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{b}</span>
                              {b === 'main' && <Badge variant="default" className="text-[10px]">default</Badge>}
                              {b === branch && <Badge variant="secondary" className="text-[10px]">current</Badge>}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{branchSnapshots.length} snapshots</Badge>
                              {b !== branch && (
                                <Button variant="outline" size="sm" onClick={() => setBranch(b)}>
                                  Switch
                                </Button>
                              )}
                              {b !== 'main' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteBranch(b)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                          {info?.description && (
                            <p className="text-xs text-muted-foreground mt-1">{info.description}</p>
                          )}
                          {info?.created_at && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Created: {format(new Date(info.created_at), 'MMM dd, yyyy HH:mm')}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}

              {branches.length > 1 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                      <GitMerge className="h-4 w-4" /> Merge Branches
                    </h4>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Select value={mergeFrom} onValueChange={setMergeFrom}>
                        <SelectTrigger className="w-36">
                          <SelectValue placeholder="From" />
                        </SelectTrigger>
                        <SelectContent>
                          {branches.filter(b => b !== mergeTo).map(b => (
                            <SelectItem key={b} value={b}>{b}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <Select value={mergeTo} onValueChange={setMergeTo}>
                        <SelectTrigger className="w-36">
                          <SelectValue placeholder="Into" />
                        </SelectTrigger>
                        <SelectContent>
                          {branches.filter(b => b !== mergeFrom).map(b => (
                            <SelectItem key={b} value={b}>{b}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        onClick={handleMergeBranch}
                        disabled={!mergeFrom || !mergeTo || mergeFrom === mergeTo}
                        className="gap-1.5"
                      >
                        <GitMerge className="h-3.5 w-3.5" /> Merge
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Snapshot Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Snapshot</DialogTitle>
            <DialogDescription>
              Save a new version of {ENTITY_TYPE_LABELS[entityType as EntityType] ?? entityType} / {entityId} on branch "{branch}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Content</Label>
              <Textarea
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                placeholder="Paste or type content to snapshot..."
                rows={8}
              />
            </div>
            <div>
              <Label>Comment (optional)</Label>
              <Input
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Describe what changed..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreateSnapshot} disabled={!newContent.trim()}>
              Create Snapshot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Branch Dialog */}
      <Dialog open={showBranchDialog} onOpenChange={setShowBranchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Branch</DialogTitle>
            <DialogDescription>
              Create a new branch from snapshot{' '}
              {branchSourceSnap?.comment || branchSourceSnap?.id.slice(0, 12)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Branch Name</Label>
              <Input
                value={newBranchName}
                onChange={e => setNewBranchName(e.target.value)}
                placeholder="e.g. experiment-v2"
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input
                value={newBranchDesc}
                onChange={e => setNewBranchDesc(e.target.value)}
                placeholder="What is this branch for?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBranchDialog(false)}>Cancel</Button>
            <Button onClick={handleConfirmCreateBranch} disabled={!newBranchName.trim()}>
              Create Branch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge Dialog */}
      <Dialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge Branch</DialogTitle>
            <DialogDescription>
              Merge the latest snapshot from one branch into another.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3">
            <Select value={mergeFrom} onValueChange={setMergeFrom}>
              <SelectTrigger>
                <SelectValue placeholder="From branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.filter(b => b !== mergeTo).map(b => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            <Select value={mergeTo} onValueChange={setMergeTo}>
              <SelectTrigger>
                <SelectValue placeholder="Into branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.filter(b => b !== mergeFrom).map(b => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMergeDialog(false)}>Cancel</Button>
            <Button onClick={handleMergeBranch} disabled={!mergeFrom || !mergeTo || mergeFrom === mergeTo}>
              Merge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import History</DialogTitle>
            <DialogDescription>
              Import previously exported version history JSON.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileImport}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="gap-1.5"
              >
                <Upload className="h-4 w-4" /> Choose File
              </Button>
            </div>
            <div>
              <Label>Or paste JSON</Label>
              <Textarea
                value={importJson}
                onChange={e => setImportJson(e.target.value)}
                placeholder='{"exported_at": "...", "snapshots": [...]}'
                rows={8}
                className="font-mono text-xs"
              />
            </div>
            {importJson && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <AlertCircle className="h-3.5 w-3.5" />
                {importJson.length.toLocaleString()} characters loaded
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowImport(false); setImportJson('') }}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={!importJson.trim()}>
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
