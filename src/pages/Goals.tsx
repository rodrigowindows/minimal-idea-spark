import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
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
import { cn } from '@/lib/utils'
import { useLocalData, type Goal } from '@/hooks/useLocalData'
import { toast } from 'sonner'
import {
  Flag,
  Plus,
  Trash2,
  Target,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronUp,
  Milestone,
} from 'lucide-react'
import { VoiceInput } from '@/components/smart-capture/VoiceInput'
import { format, differenceInDays, isPast } from 'date-fns'

export function Goals() {
  const { goals, domains, addGoal, updateGoal, toggleMilestone, deleteGoal } = useLocalData()
  const [showNew, setShowNew] = useState(false)
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null)

  // New goal form state
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newDomainId, setNewDomainId] = useState<string>('')
  const [newTargetDate, setNewTargetDate] = useState('')
  const [newMilestones, setNewMilestones] = useState<string[]>([''])

  function handleCreateGoal(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return

    addGoal({
      title: newTitle.trim(),
      description: newDescription.trim(),
      domain_id: newDomainId || null,
      target_date: newTargetDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      progress: 0,
      milestones: newMilestones
        .filter(m => m.trim())
        .map((m, i) => ({ id: `ms-${Date.now()}-${i}`, title: m.trim(), done: false })),
    })

    setNewTitle('')
    setNewDescription('')
    setNewDomainId('')
    setNewTargetDate('')
    setNewMilestones([''])
    setShowNew(false)
    toast.success('Goal created!')
  }

  const activeGoals = goals.filter(g => g.progress < 100)
  const completedGoals = goals.filter(g => g.progress >= 100)

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Flag className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Goals & Milestones</h1>
          </div>
          <Button onClick={() => setShowNew(true)} className="gap-2">
            <Plus className="h-4 w-4" />New Goal
          </Button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Set ambitious goals and break them into milestones.
        </p>
      </header>

      {goals.length === 0 ? (
        <Card className="rounded-xl">
          <CardContent className="py-12 text-center">
            <Flag className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">No goals yet. Define what you're aiming for!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {activeGoals.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Active Goals</h2>
              <AnimatePresence>
                {activeGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    domains={domains}
                    expanded={expandedGoal === goal.id}
                    onToggleExpand={() => setExpandedGoal(expandedGoal === goal.id ? null : goal.id)}
                    onToggleMilestone={(milestoneId) => toggleMilestone(goal.id, milestoneId)}
                    onDelete={() => {
                      deleteGoal(goal.id)
                      toast.success('Goal deleted')
                    }}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}

          {completedGoals.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-green-400">Completed Goals</h2>
              {completedGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  domains={domains}
                  expanded={expandedGoal === goal.id}
                  onToggleExpand={() => setExpandedGoal(expandedGoal === goal.id ? null : goal.id)}
                  onToggleMilestone={(milestoneId) => toggleMilestone(goal.id, milestoneId)}
                  onDelete={() => {
                    deleteGoal(goal.id)
                    toast.success('Goal deleted')
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* New goal dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Goal</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateGoal} className="space-y-4">
            <div className="space-y-2">
              <Label>Goal Title</Label>
              <div className="flex items-center gap-1">
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Pass SEFAZ exam"
                  required
                  className="flex-1"
                />
                <VoiceInput
                  onTranscript={(text) => setNewTitle((prev) => prev ? prev + ' ' + text : text)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <div className="relative">
                <Textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="What does achieving this look like?"
                  rows={2}
                  className="pr-12"
                />
                <div className="absolute right-2 top-2">
                  <VoiceInput
                    onTranscript={(text) => setNewDescription((prev) => prev ? prev + ' ' + text : text)}
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Domain</Label>
                <Select value={newDomainId} onValueChange={setNewDomainId}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {domains.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target Date</Label>
                <Input
                  type="date"
                  value={newTargetDate}
                  onChange={(e) => setNewTargetDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Milestones</Label>
              {newMilestones.map((ms, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={ms}
                    onChange={(e) => {
                      const updated = [...newMilestones]
                      updated[i] = e.target.value
                      setNewMilestones(updated)
                    }}
                    placeholder={`Milestone ${i + 1}`}
                  />
                  {i === newMilestones.length - 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setNewMilestones([...newMilestones, ''])}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
              <Button type="submit" disabled={!newTitle.trim()}>Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function GoalCard({
  goal,
  domains,
  expanded,
  onToggleExpand,
  onToggleMilestone,
  onDelete,
}: {
  goal: Goal
  domains: any[]
  expanded: boolean
  onToggleExpand: () => void
  onToggleMilestone: (id: string) => void
  onDelete: () => void
}) {
  const domain = domains.find(d => d.id === goal.domain_id)
  const daysLeft = differenceInDays(new Date(goal.target_date), new Date())
  const isOverdue = isPast(new Date(goal.target_date)) && goal.progress < 100
  const isComplete = goal.progress >= 100

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={cn('rounded-xl', isComplete && 'border-green-500/30 bg-green-500/5')}>
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <div className={cn(
              'mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
              isComplete ? 'bg-green-500/20 text-green-400' : 'bg-primary/10 text-primary'
            )}>
              <Target className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className={cn('font-semibold', isComplete && 'text-green-400')}>{goal.title}</h3>
                  {goal.description && (
                    <p className="mt-0.5 text-sm text-muted-foreground">{goal.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleExpand}>
                    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                {domain && (
                  <Badge variant="outline" className="text-xs" style={{ borderColor: domain.color_theme, color: domain.color_theme }}>
                    {domain.name}
                  </Badge>
                )}
                <Badge variant="secondary" className={cn('gap-1 text-xs', isOverdue && 'bg-red-500/20 text-red-400')}>
                  <CalendarIcon className="h-3 w-3" />
                  {isOverdue ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                </Badge>
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Milestone className="h-3 w-3" />
                  {goal.milestones.filter(m => m.done).length}/{goal.milestones.length}
                </Badge>
              </div>

              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{goal.progress}%</span>
                </div>
                <Progress value={goal.progress} className="h-2" />
              </div>

              {expanded && goal.milestones.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="mt-4 space-y-2 border-t border-border/50 pt-3"
                >
                  {goal.milestones.map((ms) => (
                    <label
                      key={ms.id}
                      className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={ms.done}
                        onCheckedChange={() => onToggleMilestone(ms.id)}
                      />
                      <span className={cn('text-sm', ms.done && 'line-through text-muted-foreground')}>
                        {ms.title}
                      </span>
                    </label>
                  ))}
                </motion.div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
