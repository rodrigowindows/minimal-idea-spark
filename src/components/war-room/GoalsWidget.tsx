import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useLocalData } from '@/hooks/useLocalData'
import { calculateGoalProgress, getScoreColor } from '@/lib/goals/goal-service'
import { Flag, TrendingUp, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function GoalsWidget() {
  const { t } = useTranslation()
  const { goals, opportunities } = useLocalData()
  const navigate = useNavigate()

  const activeGoals = useMemo(() =>
    goals.filter(g => g.status === 'active').slice(0, 4),
    [goals]
  )

  const overallProgress = useMemo(() => {
    if (activeGoals.length === 0) return 0
    const total = activeGoals.reduce(
      (sum, g) => sum + calculateGoalProgress(g, opportunities ?? []),
      0
    )
    return Math.round(total / activeGoals.length)
  }, [activeGoals, opportunities])

  const totalActive = goals.filter(g => g.status === 'active').length
  const totalKRs = activeGoals.reduce((sum, g) => sum + (g.key_results?.length ?? 0), 0)

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Flag className="h-4 w-4 text-primary" />
            {t('goals.widgetTitle')}
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => navigate('/goals')}>
            {t('goals.viewAll')}
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {activeGoals.length === 0 ? (
          <div className="text-center py-4">
            <Flag className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">{t('goals.noActiveGoals')}</p>
            <Button variant="link" size="sm" onClick={() => navigate('/goals')} className="mt-1">
              {t('goals.createFirst')}
            </Button>
          </div>
        ) : (
          <>
            {/* Overall summary */}
            <div className="flex items-center gap-3 rounded-lg bg-muted/30 p-3">
              <TrendingUp className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">
                    {totalActive} {t('goals.activeGoalsCount')} &middot; {totalKRs} KRs
                  </span>
                  <span className={cn('font-semibold', getScoreColor(overallProgress))}>
                    {overallProgress}%
                  </span>
                </div>
                <Progress value={overallProgress} className="h-1.5" />
              </div>
            </div>

            {/* Individual goals */}
            {activeGoals.map(goal => {
              const progress = calculateGoalProgress(goal, opportunities ?? [])
              return (
                <div
                  key={goal.id}
                  className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/30 cursor-pointer"
                  onClick={() => navigate('/goals')}
                >
                  <div className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                    progress >= 70 ? 'bg-green-500/20 text-green-500' :
                    progress >= 40 ? 'bg-yellow-500/20 text-yellow-500' :
                    'bg-red-500/20 text-red-500'
                  )}>
                    {progress}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{goal.title}</p>
                    <div className="flex items-center gap-1.5">
                      {goal.key_results.length > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          {goal.key_results.length} KRs
                        </span>
                      )}
                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                        {goal.cycle}
                      </Badge>
                    </div>
                  </div>
                  <Progress value={progress} className="h-1 w-16 shrink-0" />
                </div>
              )
            })}
          </>
        )}
      </CardContent>
    </Card>
  )
}
