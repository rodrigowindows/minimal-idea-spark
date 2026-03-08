import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { Goal, KeyResult } from '@/hooks/useLocalData'
import type { Opportunity } from '@/types'
import { GoalProgress } from './GoalProgress'
import { LinkOpportunityModal } from './LinkOpportunityModal'
import {
  getKeyResultProgress,
  calculateGoalProgress,
  getCycleLabel,
  getScoreColor,
} from '@/lib/goals/goal-service'
import { differenceInDays, isPast } from 'date-fns'
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronUp,
  Link2,
  Milestone,
  Plus,
  Target,
  Trash2,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Sparkles,
} from 'lucide-react'

interface GoalCardProps {
  goal: Goal
  domains: Array<{ id: string; name: string; color_theme: string }>
  opportunities: Opportunity[]
  expanded: boolean
  onToggleExpand: () => void
  onToggleMilestone: (id: string) => void
  onDelete: () => void
  onSuggest?: () => void
  suggesting?: boolean
  onAddKeyResult: (kr: Omit<KeyResult, 'id' | 'linked_opportunity_ids'>) => void
  onUpdateKeyResult: (krId: string, data: Partial<KeyResult>) => void
  onDeleteKeyResult: (krId: string) => void
  onLinkOpportunity: (krId: string, oppId: string) => void
  onUnlinkOpportunity: (krId: string, oppId: string) => void
  onComplete: () => void
  onCancel: () => void
}

export function GoalCard({
  goal,
  domains,
  opportunities,
  expanded,
  onToggleExpand,
  onToggleMilestone,
  onDelete,
  onSuggest,
  suggesting,
  onAddKeyResult,
  onUpdateKeyResult,
  onDeleteKeyResult,
  onLinkOpportunity,
  onUnlinkOpportunity,
  onComplete,
  onCancel,
}: GoalCardProps) {
  const { t } = useTranslation()
  const domain = domains.find(d => d.id === goal.domain_id)
  const daysLeft = differenceInDays(new Date(goal.target_date), new Date())
  const isOverdue = isPast(new Date(goal.target_date)) && goal.status === 'active'
  const isComplete = goal.status === 'completed'
  const isCancelled = goal.status === 'cancelled'
  const calculatedProgress = calculateGoalProgress(goal, opportunities)

  const [showAddKR, setShowAddKR] = useState(false)
  const [newKRTitle, setNewKRTitle] = useState('')
  const [newKRTarget, setNewKRTarget] = useState('1')
  const [newKRUnit, setNewKRUnit] = useState('')
  const [linkingKR, setLinkingKR] = useState<KeyResult | null>(null)

  function handleAddKR() {
    if (!newKRTitle.trim()) return
    onAddKeyResult({
      title: newKRTitle.trim(),
      target_value: Number(newKRTarget) || 1,
      current_value: 0,
      unit: newKRUnit.trim() || 'items',
    })
    setNewKRTitle('')
    setNewKRTarget('1')
    setNewKRUnit('')
    setShowAddKR(false)
  }

  const totalLinked = goal.key_results.reduce(
    (sum, kr) => sum + kr.linked_opportunity_ids.length, 0
  )

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={cn(
        'rounded-xl',
        isComplete && 'border-green-500/30 bg-green-500/5',
        isCancelled && 'border-red-500/30 bg-red-500/5 opacity-60',
      )}>
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <div className={cn(
              'mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
              isComplete ? 'bg-green-500/20 text-green-400' :
              isCancelled ? 'bg-red-500/20 text-red-400' :
              'bg-primary/10 text-primary'
            )}>
              <Target className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className={cn(
                    'font-semibold',
                    isComplete && 'text-green-400',
                    isCancelled && 'text-red-400 line-through',
                  )}>
                    {goal.title}
                  </h3>
                  {goal.description && (
                    <p className="mt-0.5 text-sm text-muted-foreground">{goal.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {goal.status === 'active' && (
                    <>
                      <Button variant="ghost" size="icon" className="h-7 w-7" title={t('goals.markComplete')} onClick={onComplete}>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" title={t('goals.cancelGoal')} onClick={onCancel}>
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleExpand}>
                    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                {goal.priority_level && goal.priority_level !== 'medium' && (
                  <Badge variant={goal.priority_level === 'critical' ? 'destructive' : goal.priority_level === 'high' ? 'default' : 'outline'} className="text-xs">
                    {goal.priority_level === 'critical' ? '🔴' : goal.priority_level === 'high' ? '🟠' : '⚪'} {goal.priority_level}
                  </Badge>
                )}
                {domain && (
                  <Badge variant="outline" className="text-xs" style={{ borderColor: domain.color_theme, color: domain.color_theme }}>
                    {domain.name}
                  </Badge>
                )}
                <Badge variant="secondary" className="text-xs">
                  {getCycleLabel(goal.cycle)}
                </Badge>
                <Badge variant="secondary" className={cn('gap-1 text-xs', isOverdue && 'bg-red-500/20 text-red-400')}>
                  <CalendarIcon className="h-3 w-3" />
                  {goal.status !== 'active'
                    ? goal.status === 'completed' ? t('goals.completed') : t('goals.cancelled')
                    : isOverdue ? t('goals.daysOverdue', { count: Math.abs(daysLeft) }) : t('goals.daysLeft', { count: daysLeft })
                  }
                </Badge>
                {goal.key_results.length > 0 && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <TrendingUp className="h-3 w-3" />
                    {goal.key_results.length} KRs
                  </Badge>
                )}
                {goal.milestones.length > 0 && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <Milestone className="h-3 w-3" />
                    {goal.milestones.filter(m => m.done).length}/{goal.milestones.length}
                  </Badge>
                )}
                {totalLinked > 0 && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Link2 className="h-3 w-3" />
                    {totalLinked} {t('goals.linked')}
                  </Badge>
                )}
                {goal.final_score !== undefined && (
                  <Badge variant="outline" className={cn('text-xs font-semibold', getScoreColor(goal.final_score))}>
                    {t('goals.finalScore')}: {goal.final_score}%
                  </Badge>
                )}
              </div>

              <GoalProgress value={calculatedProgress} label={t('goals.progress')} className="mt-3" />

              {/* Expanded details: Key Results tree, Milestones */}
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="mt-4 space-y-4 border-t border-border/50 pt-3"
                >
                  {/* Key Results Section */}
                  <div>
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <h4 className="text-sm font-semibold">{t('goals.keyResults')}</h4>
                      <div className="flex items-center gap-2">
                        {goal.status === 'active' && onSuggest && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 text-xs"
                            onClick={onSuggest}
                            disabled={suggesting}
                          >
                            <Sparkles className="h-3 w-3" />
                            {suggesting ? t('goals.generatingSuggestions') : t('goals.suggestOpportunities')}
                          </Button>
                        )}
                        {goal.status === 'active' && (
                          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setShowAddKR(true)}>
                            <Plus className="h-3 w-3" />{t('goals.addKR')}
                          </Button>
                        )}
                      </div>
                    </div>

                    {goal.key_results.length === 0 && !showAddKR && (
                      <p className="text-xs text-muted-foreground italic">{t('goals.noKeyResults')}</p>
                    )}

                    {goal.key_results.map(kr => {
                      const krProgress = getKeyResultProgress(kr)
                      const linkedOpps = opportunities.filter(o => kr.linked_opportunity_ids.includes(o.id))
                      return (
                        <div key={kr.id} className="mb-3 rounded-lg bg-muted/30 p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{kr.title}</span>
                            <div className="flex items-center gap-1">
                              {goal.status === 'active' && (
                                <>
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setLinkingKR(kr)}>
                                    <Link2 className="h-3 w-3" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDeleteKeyResult(kr.id)}>
                                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                            <span className={cn('font-semibold', getScoreColor(krProgress))}>
                              {kr.current_value}/{kr.target_value} {kr.unit}
                            </span>
                            <span>({krProgress}%)</span>
                          </div>
                          {goal.status === 'active' && (
                            <div className="mt-1.5 flex items-center gap-2">
                              <Input
                                type="number"
                                className="h-7 w-20 text-xs"
                                value={kr.current_value}
                                min={0}
                                onChange={(e) => onUpdateKeyResult(kr.id, { current_value: Number(e.target.value) || 0 })}
                              />
                              <span className="text-xs text-muted-foreground">/ {kr.target_value} {kr.unit}</span>
                            </div>
                          )}
                          <GoalProgress value={krProgress} size="sm" className="mt-2" />

                          {/* Linked opportunities */}
                          {linkedOpps.length > 0 && (
                            <div className="mt-2 space-y-1 border-t border-border/30 pt-2">
                              {linkedOpps.map(opp => (
                                <div key={opp.id} className="flex items-center gap-2 text-xs">
                                  <div className={cn(
                                    'h-2 w-2 rounded-full',
                                    opp.status === 'done' ? 'bg-green-500' :
                                    opp.status === 'doing' ? 'bg-blue-500' :
                                    'bg-gray-400'
                                  )} />
                                  <span className={cn(opp.status === 'done' && 'line-through text-muted-foreground')}>
                                    {opp.title}
                                  </span>
                                  <Badge variant="outline" className="text-[10px] px-1 py-0 ml-auto">
                                    {opp.status}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* Add Key Result inline form */}
                    {showAddKR && (
                      <div className="rounded-lg border border-dashed border-border p-3 space-y-2">
                        <Input
                          value={newKRTitle}
                          onChange={(e) => setNewKRTitle(e.target.value)}
                          placeholder={t('goals.krTitlePlaceholder')}
                          className="h-8 text-sm"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            value={newKRTarget}
                            onChange={(e) => setNewKRTarget(e.target.value)}
                            placeholder={t('goals.target')}
                            className="h-8 w-20 text-sm"
                            min={1}
                          />
                          <Input
                            value={newKRUnit}
                            onChange={(e) => setNewKRUnit(e.target.value)}
                            placeholder={t('goals.unitPlaceholder')}
                            className="h-8 flex-1 text-sm"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" className="h-7 text-xs" onClick={handleAddKR} disabled={!newKRTitle.trim()}>
                            {t('common.create')}
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowAddKR(false)}>
                            {t('common.cancel')}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Milestones Section */}
                  {goal.milestones.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">{t('goals.milestones')}</h4>
                      {goal.milestones.map((ms) => (
                        <label
                          key={ms.id}
                          className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-muted/50 cursor-pointer"
                        >
                          <Checkbox
                            checked={ms.done}
                            onCheckedChange={() => onToggleMilestone(ms.id)}
                            disabled={goal.status !== 'active'}
                          />
                          <span className={cn('text-sm', ms.done && 'line-through text-muted-foreground')}>
                            {ms.title}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Link opportunity modal */}
      {linkingKR && (
        <LinkOpportunityModal
          open={!!linkingKR}
          onOpenChange={(open) => { if (!open) setLinkingKR(null) }}
          opportunities={opportunities}
          keyResult={linkingKR}
          onLink={(oppId) => onLinkOpportunity(linkingKR.id, oppId)}
          onUnlink={(oppId) => onUnlinkOpportunity(linkingKR.id, oppId)}
        />
      )}
    </motion.div>
  )
}
