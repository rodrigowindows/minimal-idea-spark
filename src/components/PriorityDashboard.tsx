import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import {
  Plus,
  TrendingUp,
  AlertCircle,
  Target,
  Brain,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Crosshair,
  Archive,
  Trash2,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Zap,
  Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePriorities } from '@/hooks/usePriorities'
import { useLocalData } from '@/hooks/useLocalData'
import type { Priority, PriorityLevel, PriorityCategory, KeyResult, PriorityInsight } from '@/lib/rag/priority-context'
import {
  loadPersistentContext,
  savePersistentContext,
  shouldAutoReevaluate,
  markReevaluated,
  syncPrioritiesToPersistentContext,
} from '@/lib/rag/priority-context'
import { suggestPriorityLevel } from '@/lib/rag/goal-embeddings'
import { toast } from 'sonner'

const PRIORITY_COLORS: Record<PriorityLevel, string> = {
  critical: 'bg-red-500/15 text-red-400 border-red-500/30',
  high: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  medium: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  low: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
}

const PRIORITY_BADGE_VARIANT: Record<PriorityLevel, 'destructive' | 'default' | 'secondary' | 'outline'> = {
  critical: 'destructive',
  high: 'default',
  medium: 'secondary',
  low: 'outline',
}

const CATEGORY_ICONS: Record<PriorityCategory, string> = {
  career: '💼', health: '🏃', finance: '💰', learning: '📚', family: '👨‍👩‍👧', personal: '🌟', custom: '🔧',
}

const INSIGHT_ICONS: Record<PriorityInsight['type'], typeof AlertCircle> = {
  risk: AlertTriangle,
  alignment: Crosshair,
  suggestion: Lightbulb,
  progress: TrendingUp,
}

export function PriorityDashboard() {
  const { opportunities, goals } = useLocalData()
  const {
    priorities,
    activePriorities,
    completedPriorities,
    archivedPriorities,
    insights,
    suggestions,
    stats,
    addPriority,
    updatePriority,
    deletePriority,
    changePriorityStatus,
    updateKeyResult,
    addKeyResult,
    removeKeyResult,
  } = usePriorities(opportunities, goals)

  const [showNewDialog, setShowNewDialog] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [objectivesInput, setObjectivesInput] = useState('')
  const [showObjectives, setShowObjectives] = useState(false)

  // Load persistent context for objectives editor
  const persistentCtx = useMemo(() => loadPersistentContext(), [priorities])

  // Sync priorities to persistent context when they change
  useEffect(() => {
    syncPrioritiesToPersistentContext(priorities)
  }, [priorities])

  // Auto-reevaluation check
  useEffect(() => {
    if (shouldAutoReevaluate(priorities)) {
      markReevaluated()
    }
  }, [priorities])

  function handleSaveObjectives() {
    const objectives = objectivesInput
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0)
    const ctx = loadPersistentContext()
    savePersistentContext({ ...ctx, objectives })
    toast.success('Objectives updated!')
    setShowObjectives(false)
  }

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Crosshair className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Priority Command Center</h1>
              <p className="text-sm text-muted-foreground">RAG-powered objective tracking with AI prioritization</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => {
              setObjectivesInput(persistentCtx.objectives.join('\n'))
              setShowObjectives(true)
            }} className="gap-2">
              <Brain className="h-4 w-4" />
              Objectives
            </Button>
            <Button onClick={() => setShowNewDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              New Priority
            </Button>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={Target} label="Active" value={stats.active} color="text-primary" />
        <StatCard icon={AlertTriangle} label="Critical" value={stats.criticalCount} color="text-red-400" />
        <StatCard icon={TrendingUp} label="Avg Progress" value={`${stats.avgProgress}%`} color="text-green-400" />
        <StatCard icon={CheckCircle2} label="Key Results" value={`${stats.completedKeyResults}/${stats.totalKeyResults}`} color="text-blue-400" />
      </div>

      {/* Insights & Suggestions */}
      {(insights.length > 0 || suggestions.length > 0) && (
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          {insights.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-4 w-4 text-amber-400" />
                  Insights & Risks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {insights.slice(0, 5).map((insight, i) => {
                    const Icon = INSIGHT_ICONS[insight.type]
                    return (
                      <div key={i} className={cn(
                        'flex items-start gap-2 rounded-lg p-2 text-sm',
                        insight.severity === 'warning' && 'bg-amber-500/10',
                        insight.severity === 'info' && 'bg-blue-500/10',
                        insight.severity === 'success' && 'bg-green-500/10',
                      )}>
                        <Icon className={cn(
                          'mt-0.5 h-4 w-4 shrink-0',
                          insight.severity === 'warning' && 'text-amber-400',
                          insight.severity === 'info' && 'text-blue-400',
                          insight.severity === 'success' && 'text-green-400',
                        )} />
                        <span>{insight.message}</span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {suggestions.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Zap className="h-4 w-4 text-primary" />
                  AI Suggested Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {suggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Priority Tabs */}
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active" className="gap-1.5">
            Active <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{activePriorities.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-1.5">
            Completed <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{completedPriorities.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="archived" className="gap-1.5">
            Archived <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{archivedPriorities.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          {activePriorities.length === 0 ? (
            <Card className="rounded-xl">
              <CardContent className="py-12 text-center">
                <Crosshair className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground">No active priorities. Add your first to stay focused!</p>
                <Button className="mt-4 gap-2" onClick={() => setShowNewDialog(true)}>
                  <Plus className="h-4 w-4" />Add Priority
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activePriorities.map(p => (
                <PriorityCard
                  key={p.id}
                  priority={p}
                  expanded={expandedId === p.id}
                  onToggleExpand={() => setExpandedId(expandedId === p.id ? null : p.id)}
                  onComplete={() => { changePriorityStatus(p.id, 'completed'); toast.success('Priority completed!') }}
                  onArchive={() => { changePriorityStatus(p.id, 'archived'); toast.success('Priority archived') }}
                  onDelete={() => { deletePriority(p.id); toast.success('Priority deleted') }}
                  onUpdateKR={(krId, data) => updateKeyResult(p.id, krId, data)}
                  onAddKR={(kr) => addKeyResult(p.id, kr)}
                  onRemoveKR={(krId) => removeKeyResult(p.id, krId)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          {completedPriorities.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No completed priorities yet.</p>
          ) : (
            <div className="space-y-3">
              {completedPriorities.map(p => (
                <PriorityCard
                  key={p.id}
                  priority={p}
                  expanded={expandedId === p.id}
                  onToggleExpand={() => setExpandedId(expandedId === p.id ? null : p.id)}
                  onArchive={() => changePriorityStatus(p.id, 'archived')}
                  onDelete={() => deletePriority(p.id)}
                  onUpdateKR={(krId, data) => updateKeyResult(p.id, krId, data)}
                  onAddKR={(kr) => addKeyResult(p.id, kr)}
                  onRemoveKR={(krId) => removeKeyResult(p.id, krId)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="archived" className="mt-4">
          {archivedPriorities.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No archived priorities.</p>
          ) : (
            <div className="space-y-3">
              {archivedPriorities.map(p => (
                <PriorityCard
                  key={p.id}
                  priority={p}
                  expanded={expandedId === p.id}
                  onToggleExpand={() => setExpandedId(expandedId === p.id ? null : p.id)}
                  onDelete={() => deletePriority(p.id)}
                  onUpdateKR={() => {}}
                  onAddKR={() => {}}
                  onRemoveKR={() => {}}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* New Priority Dialog */}
      <NewPriorityDialog
        open={showNewDialog}
        onOpenChange={setShowNewDialog}
        onAdd={addPriority}
      />

      {/* Objectives Editor Dialog */}
      <Dialog open={showObjectives} onOpenChange={setShowObjectives}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Persistent Objectives
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            These objectives are always kept in context. The AI advisor will consider them in every response.
          </p>
          <Textarea
            value={objectivesInput}
            onChange={(e) => setObjectivesInput(e.target.value)}
            placeholder="One objective per line, e.g.:\nPass SEFAZ exam by March\nBuild emergency fund of $10k\nMaintain consistent workout routine"
            rows={6}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowObjectives(false)}>Cancel</Button>
            <Button onClick={handleSaveObjectives}>Save Objectives</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// --- Sub-components ---

function StatCard({ icon: Icon, label, value, color }: {
  icon: typeof Target; label: string; value: string | number; color: string
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <Icon className={cn('h-5 w-5', color)} />
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function PriorityCard({ priority: p, expanded, onToggleExpand, onComplete, onArchive, onDelete, onUpdateKR, onAddKR, onRemoveKR }: {
  priority: Priority
  expanded: boolean
  onToggleExpand: () => void
  onComplete?: () => void
  onArchive?: () => void
  onDelete: () => void
  onUpdateKR: (krId: string, data: Partial<KeyResult>) => void
  onAddKR: (kr: Omit<KeyResult, 'id'>) => void
  onRemoveKR: (krId: string) => void
}) {
  const [newKRTitle, setNewKRTitle] = useState('')
  const [newKRTarget, setNewKRTarget] = useState('')
  const [newKRUnit, setNewKRUnit] = useState('')

  const isOverdue = p.due_date && new Date(p.due_date) < new Date() && p.status === 'active'

  return (
    <Card className={cn(
      'transition-all',
      p.status === 'completed' && 'border-green-500/30 bg-green-500/5',
      p.status === 'archived' && 'opacity-60',
    )}>
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <div className={cn('mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg', PRIORITY_COLORS[p.priority_level])}>
            {CATEGORY_ICONS[p.category]}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <Badge variant={PRIORITY_BADGE_VARIANT[p.priority_level]}>
                    {p.priority_level}
                  </Badge>
                  <Badge variant="outline" className="text-xs">{p.category}</Badge>
                  {isOverdue && <Badge variant="destructive" className="text-xs">Overdue</Badge>}
                </div>
                <h3 className="font-semibold">{p.title}</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">{p.description}</p>
              </div>
              <div className="flex items-center gap-1">
                {onComplete && p.status === 'active' && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onComplete} title="Complete">
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                  </Button>
                )}
                {onArchive && p.status !== 'archived' && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onArchive} title="Archive">
                    <Archive className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete} title="Delete">
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleExpand}>
                  {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {p.key_results.length > 0
                    ? `${p.key_results.filter(k => k.done).length}/${p.key_results.length} key results`
                    : 'Progress'}
                </span>
                <span className="font-medium">{p.progress}%</span>
              </div>
              <Progress value={p.progress} className="h-2" />
            </div>

            {/* Due date & last update */}
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
              {p.due_date && (
                <span className={cn('flex items-center gap-1', isOverdue && 'text-red-400')}>
                  <Clock className="h-3 w-3" />
                  Due: {new Date(p.due_date).toLocaleDateString()}
                </span>
              )}
              <span className="flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />
                Updated: {new Date(p.updated_at).toLocaleDateString()}
              </span>
            </div>

            {/* AI Suggestions */}
            {p.ai_suggestions.length > 0 && (
              <div className="mt-2 rounded-lg bg-primary/5 p-2">
                <p className="mb-1 text-xs font-medium text-primary flex items-center gap-1">
                  <Brain className="h-3 w-3" /> AI Suggestions
                </p>
                <ul className="space-y-1">
                  {p.ai_suggestions.slice(0, 3).map((s, i) => (
                    <li key={i} className="text-xs text-muted-foreground">• {s}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Expanded: Key Results */}
            {expanded && (
              <div className="mt-4 space-y-3 border-t border-border/50 pt-3">
                <h4 className="text-sm font-medium">Key Results</h4>
                {p.key_results.map(kr => (
                  <div key={kr.id} className="flex items-center gap-3 rounded-lg bg-muted/30 p-2">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className={cn('text-sm', kr.done && 'line-through text-muted-foreground')}>{kr.title}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRemoveKR(kr.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <Input
                          type="number"
                          value={kr.current}
                          onChange={(e) => onUpdateKR(kr.id, { current: Number(e.target.value) })}
                          className="h-7 w-20 text-xs"
                          min={0}
                        />
                        <span className="text-xs text-muted-foreground">/ {kr.target} {kr.unit}</span>
                        <Progress value={(kr.current / kr.target) * 100} className="h-1.5 flex-1" />
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add Key Result */}
                <div className="flex gap-2">
                  <Input
                    value={newKRTitle}
                    onChange={(e) => setNewKRTitle(e.target.value)}
                    placeholder="Key result title"
                    className="h-8 flex-1 text-xs"
                  />
                  <Input
                    value={newKRTarget}
                    onChange={(e) => setNewKRTarget(e.target.value)}
                    placeholder="Target"
                    type="number"
                    className="h-8 w-20 text-xs"
                  />
                  <Input
                    value={newKRUnit}
                    onChange={(e) => setNewKRUnit(e.target.value)}
                    placeholder="Unit"
                    className="h-8 w-20 text-xs"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    disabled={!newKRTitle.trim() || !newKRTarget}
                    onClick={() => {
                      onAddKR({ title: newKRTitle.trim(), target: Number(newKRTarget), current: 0, unit: newKRUnit || 'units', done: false })
                      setNewKRTitle(''); setNewKRTarget(''); setNewKRUnit('')
                    }}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function NewPriorityDialog({ open, onOpenChange, onAdd }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (data: any) => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [level, setLevel] = useState<PriorityLevel>('medium')
  const [category, setCategory] = useState<PriorityCategory>('career')
  const [dueDate, setDueDate] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    onAdd({
      title: title.trim(),
      description: description.trim(),
      priority_level: level,
      category,
      due_date: dueDate || undefined,
    })

    setTitle(''); setDescription(''); setLevel('medium'); setCategory('career'); setDueDate('')
    onOpenChange(false)
    toast.success('Priority created!')
  }

  // Auto-suggest priority level as user types
  useEffect(() => {
    if (title.length > 3 || description.length > 3) {
      const suggested = suggestPriorityLevel(title, description, dueDate || undefined)
      setLevel(suggested)
    }
  }, [title, description, dueDate])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Priority</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Pass SEFAZ exam" required />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Why is this important? What does success look like?" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority Level</Label>
              <Select value={level} onValueChange={(v) => setLevel(v as PriorityLevel)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">🔴 Critical</SelectItem>
                  <SelectItem value="high">🟠 High</SelectItem>
                  <SelectItem value="medium">🔵 Medium</SelectItem>
                  <SelectItem value="low">⚪ Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as PriorityCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="career">💼 Career</SelectItem>
                  <SelectItem value="health">🏃 Health</SelectItem>
                  <SelectItem value="finance">💰 Finance</SelectItem>
                  <SelectItem value="learning">📚 Learning</SelectItem>
                  <SelectItem value="family">👨‍👩‍👧 Family</SelectItem>
                  <SelectItem value="personal">🌟 Personal</SelectItem>
                  <SelectItem value="custom">🔧 Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Due Date (optional)</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!title.trim()}>Create Priority</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
