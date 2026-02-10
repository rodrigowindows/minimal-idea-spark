import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { useLocalData } from '@/hooks/useLocalData'
import { toast } from 'sonner'
import {
  Flag,
  Plus,
} from 'lucide-react'
import { VoiceInput } from '@/components/smart-capture/VoiceInput'
import { EmptyState } from '@/components/EmptyState'
import { getOpportunitiesForGoal } from '@/lib/goals/goal-service'
import { GoalCard } from '@/components/Goals/GoalCard'
import { format } from 'date-fns'

export function Goals() {
  const { t } = useTranslation()
  const { goals, domains, opportunities, addGoal, updateGoal, toggleMilestone, deleteGoal } = useLocalData()
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
    toast.success(t('goals.goalCreated'))
  }

  const activeGoals = goals.filter(g => g.progress < 100)
  const completedGoals = goals.filter(g => g.progress >= 100)

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Flag className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">{t('goals.title')}</h1>
          </div>
          <Button onClick={() => setShowNew(true)} className="gap-2">
            <Plus className="h-4 w-4" />{t('goals.newGoal')}
          </Button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('goals.description')}
        </p>
      </header>

      {goals.length === 0 ? (
        <EmptyState
          icon={Flag}
          title={t('emptyStates.goals')}
          actionLabel={t('emptyStates.goalsAction')}
          onAction={() => setShowNew(true)}
        />
      ) : (
        <div className="space-y-6">
          {activeGoals.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">{t('goals.activeGoals')}</h2>
              <AnimatePresence>
                {activeGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    domains={domains}
                    linkedCount={getOpportunitiesForGoal(opportunities ?? [], goal.id).length}
                    expanded={expandedGoal === goal.id}
                    onToggleExpand={() => setExpandedGoal(expandedGoal === goal.id ? null : goal.id)}
                    onToggleMilestone={(milestoneId) => toggleMilestone(goal.id, milestoneId)}
                    onDelete={() => {
                      deleteGoal(goal.id)
                      toast.success(t('goals.goalDeleted'))
                    }}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}

          {completedGoals.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-green-400">{t('goals.completedGoals')}</h2>
              {completedGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  domains={domains}
                  linkedCount={getOpportunitiesForGoal(opportunities ?? [], goal.id).length}
                  expanded={expandedGoal === goal.id}
                  onToggleExpand={() => setExpandedGoal(expandedGoal === goal.id ? null : goal.id)}
                  onToggleMilestone={(milestoneId) => toggleMilestone(goal.id, milestoneId)}
                  onDelete={() => {
                    deleteGoal(goal.id)
                    toast.success(t('goals.goalDeleted'))
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
