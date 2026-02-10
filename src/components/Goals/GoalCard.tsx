import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { Goal } from '@/hooks/useLocalData'
import { differenceInDays, isPast } from 'date-fns'
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronUp,
  Milestone,
  Target,
  Trash2,
} from 'lucide-react'

interface GoalCardProps {
  goal: Goal
  domains: Array<{ id: string; name: string; color_theme: string }>
  linkedCount?: number
  expanded: boolean
  onToggleExpand: () => void
  onToggleMilestone: (id: string) => void
  onDelete: () => void
}

export function GoalCard({
  goal,
  domains,
  linkedCount = 0,
  expanded,
  onToggleExpand,
  onToggleMilestone,
  onDelete,
}: GoalCardProps) {
  const { t } = useTranslation()
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
                  {isOverdue ? t('goals.daysOverdue', { count: Math.abs(daysLeft) }) : t('goals.daysLeft', { count: daysLeft })}
                </Badge>
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Milestone className="h-3 w-3" />
                  {goal.milestones.filter(m => m.done).length}/{goal.milestones.length}
                </Badge>
                {linkedCount > 0 && (
                  <Badge variant="outline" className="text-xs">{linkedCount} {t('goals.linked')}</Badge>
                )}
              </div>

              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{t('goals.progress')}</span>
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
