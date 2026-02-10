import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useLocalData } from '@/hooks/useLocalData'
import type { OKRCycle } from '@/hooks/useLocalData'
import { toast } from 'sonner'
import {
  Flag,
  Plus,
  Archive,
  TrendingUp,
} from 'lucide-react'
import { VoiceInput } from '@/components/smart-capture/VoiceInput'
import { EmptyState } from '@/components/EmptyState'
import { GoalCard } from '@/components/Goals/GoalCard'
import { getCurrentCycle, getCycleLabel, filterGoalsByCycle } from '@/lib/goals/goal-service'

const ALL_CYCLES: (OKRCycle | 'all')[] = ['all', 'Q1', 'Q2', 'Q3', 'Q4', 'S1', 'S2', 'annual', 'custom']

export function Goals() {
  const { t } = useTranslation()
  const {
    goals, domains, opportunities,
    addGoal, updateGoal, toggleMilestone, deleteGoal,
    addKeyResult, updateKeyResult, deleteKeyResult,
    linkOpportunityToKeyResult, unlinkOpportunityFromKeyResult,
    completeGoal, cancelGoal,
  } = useLocalData()
  const [showNew, setShowNew] = useState(false)
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null)
  const [selectedCycle, setSelectedCycle] = useState<OKRCycle | 'all'>('all')
  const [showHistory, setShowHistory] = useState(false)

  // New goal form state
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newDomainId, setNewDomainId] = useState<string>('')
  const [newTargetDate, setNewTargetDate] = useState('')
  const [newStartDate, setNewStartDate] = useState(new Date().toISOString().split('T')[0])
  const [newCycle, setNewCycle] = useState<OKRCycle>(getCurrentCycle())
  const [newMilestones, setNewMilestones] = useState<string[]>([''])

  function handleCreateGoal(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return

    addGoal({
      title: newTitle.trim(),
      description: newDescription.trim(),
      domain_id: newDomainId && newDomainId !== 'none' ? newDomainId : null,
      start_date: newStartDate || new Date().toISOString().split('T')[0],
      target_date: newTargetDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      progress: 0,
      milestones: newMilestones
        .filter(m => m.trim())
        .map((m, i) => ({ id: `ms-${Date.now()}-${i}`, title: m.trim(), done: false })),
      key_results: [],
      cycle: newCycle,
      status: 'active',
    })

    setNewTitle('')
    setNewDescription('')
    setNewDomainId('')
    setNewTargetDate('')
    setNewStartDate(new Date().toISOString().split('T')[0])
    setNewCycle(getCurrentCycle())
    setNewMilestones([''])
    setShowNew(false)
    toast.success(t('goals.goalCreated'))
  }

  const filteredGoals = useMemo(() => {
    return filterGoalsByCycle(goals, selectedCycle)
  }, [goals, selectedCycle])

  const activeGoals = filteredGoals.filter(g => g.status === 'active')
  const completedGoals = filteredGoals.filter(g => g.status === 'completed')
  const cancelledGoals = filteredGoals.filter(g => g.status === 'cancelled')
  const historyGoals = [...completedGoals, ...cancelledGoals]

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Flag className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">{t('goals.title')}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showHistory ? 'secondary' : 'outline'}
              size="sm"
              className="gap-1.5"
              onClick={() => setShowHistory(!showHistory)}
            >
              <Archive className="h-4 w-4" />
              {t('goals.history')}
              {historyGoals.length > 0 && (
                <span className="ml-1 rounded-full bg-muted px-1.5 text-xs">{historyGoals.length}</span>
              )}
            </Button>
            <Button onClick={() => setShowNew(true)} className="gap-2">
              <Plus className="h-4 w-4" />{t('goals.newGoal')}
            </Button>
          </div>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('goals.description')}
        </p>

        {/* Cycle filter */}
        <div className="mt-4">
          <Tabs value={selectedCycle} onValueChange={(v) => setSelectedCycle(v as OKRCycle | 'all')}>
            <TabsList className="flex-wrap h-auto gap-1">
              {ALL_CYCLES.map(c => (
                <TabsTrigger key={c} value={c} className="text-xs px-3 py-1.5">
                  {c === 'all' ? t('goals.allCycles') : getCycleLabel(c)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </header>

      {filteredGoals.length === 0 ? (
        <EmptyState
          icon={Flag}
          title={t('emptyStates.goals')}
          actionLabel={t('emptyStates.goalsAction')}
          onAction={() => setShowNew(true)}
        />
      ) : (
        <div className="space-y-6">
          {/* Active Goals */}
          {activeGoals.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">{t('goals.activeGoals')}</h2>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{activeGoals.length}</span>
              </div>
              <AnimatePresence>
                {activeGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    domains={domains}
                    opportunities={opportunities ?? []}
                    expanded={expandedGoal === goal.id}
                    onToggleExpand={() => setExpandedGoal(expandedGoal === goal.id ? null : goal.id)}
                    onToggleMilestone={(milestoneId) => toggleMilestone(goal.id, milestoneId)}
                    onDelete={() => {
                      deleteGoal(goal.id)
                      toast.success(t('goals.goalDeleted'))
                    }}
                    onAddKeyResult={(kr) => addKeyResult(goal.id, kr)}
                    onUpdateKeyResult={(krId, data) => updateKeyResult(goal.id, krId, data)}
                    onDeleteKeyResult={(krId) => deleteKeyResult(goal.id, krId)}
                    onLinkOpportunity={(krId, oppId) => linkOpportunityToKeyResult(goal.id, krId, oppId)}
                    onUnlinkOpportunity={(krId, oppId) => unlinkOpportunityFromKeyResult(goal.id, krId, oppId)}
                    onComplete={() => {
                      completeGoal(goal.id)
                      toast.success(t('goals.goalCompleted'))
                    }}
                    onCancel={() => {
                      cancelGoal(goal.id)
                      toast.success(t('goals.goalCancelled'))
                    }}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* History (completed + cancelled) */}
          {showHistory && historyGoals.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Archive className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold text-muted-foreground">{t('goals.history')}</h2>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{historyGoals.length}</span>
              </div>
              {historyGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  domains={domains}
                  opportunities={opportunities ?? []}
                  expanded={expandedGoal === goal.id}
                  onToggleExpand={() => setExpandedGoal(expandedGoal === goal.id ? null : goal.id)}
                  onToggleMilestone={(milestoneId) => toggleMilestone(goal.id, milestoneId)}
                  onDelete={() => {
                    deleteGoal(goal.id)
                    toast.success(t('goals.goalDeleted'))
                  }}
                  onAddKeyResult={(kr) => addKeyResult(goal.id, kr)}
                  onUpdateKeyResult={(krId, data) => updateKeyResult(goal.id, krId, data)}
                  onDeleteKeyResult={(krId) => deleteKeyResult(goal.id, krId)}
                  onLinkOpportunity={(krId, oppId) => linkOpportunityToKeyResult(goal.id, krId, oppId)}
                  onUnlinkOpportunity={(krId, oppId) => unlinkOpportunityFromKeyResult(goal.id, krId, oppId)}
                  onComplete={() => completeGoal(goal.id)}
                  onCancel={() => cancelGoal(goal.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* New goal dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('goals.newGoal')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateGoal} className="space-y-4">
            <div className="space-y-2">
              <Label>{t('goals.goalTitle')}</Label>
              <div className="flex items-center gap-1">
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={t('goals.goalPlaceholder')}
                  required
                  className="flex-1"
                />
                <VoiceInput
                  onTranscript={(text) => setNewTitle((prev) => prev ? prev + ' ' + text : text)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('goals.goalDescription')}</Label>
              <div className="relative">
                <Textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder={t('goals.goalDescPlaceholder')}
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
                <Label>{t('goals.domain')}</Label>
                <Select value={newDomainId} onValueChange={setNewDomainId}>
                  <SelectTrigger><SelectValue placeholder={t('goals.optional')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('common.none')}</SelectItem>
                    {domains.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('goals.cycle')}</Label>
                <Select value={newCycle} onValueChange={(v) => setNewCycle(v as OKRCycle)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['Q1', 'Q2', 'Q3', 'Q4', 'S1', 'S2', 'annual', 'custom'] as OKRCycle[]).map(c => (
                      <SelectItem key={c} value={c}>{getCycleLabel(c)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('goals.startDate')}</Label>
                <Input
                  type="date"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('goals.targetDate')}</Label>
                <Input
                  type="date"
                  value={newTargetDate}
                  onChange={(e) => setNewTargetDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('goals.milestones')}</Label>
              {newMilestones.map((ms, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={ms}
                    onChange={(e) => {
                      const updated = [...newMilestones]
                      updated[i] = e.target.value
                      setNewMilestones(updated)
                    }}
                    placeholder={t('goals.milestonePlaceholder', { number: i + 1 })}
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
              <Button type="button" variant="outline" onClick={() => setShowNew(false)}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={!newTitle.trim()}>{t('common.create')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
