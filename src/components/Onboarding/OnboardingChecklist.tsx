import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Circle, Target, BookOpen, MessageSquare, Focus, X, ChevronDown, ChevronUp } from 'lucide-react'
import { useOnboarding, type ChecklistState } from '@/hooks/useOnboarding'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface ChecklistItemDef {
  key: keyof ChecklistState
  titleKey: string
  descKey: string
  route: string
  icon: typeof Target
}

const ITEMS: ChecklistItemDef[] = [
  {
    key: 'createdOpportunity',
    titleKey: 'onboarding.checklist.createOpportunity',
    descKey: 'onboarding.checklist.createOpportunityDesc',
    route: '/opportunities',
    icon: Target,
  },
  {
    key: 'wroteJournal',
    titleKey: 'onboarding.checklist.writeJournal',
    descKey: 'onboarding.checklist.writeJournalDesc',
    route: '/journal',
    icon: BookOpen,
  },
  {
    key: 'visitedConsultant',
    titleKey: 'onboarding.checklist.visitConsultant',
    descKey: 'onboarding.checklist.visitConsultantDesc',
    route: '/consultant',
    icon: MessageSquare,
  },
  {
    key: 'triedDeepWork',
    titleKey: 'onboarding.checklist.tryDeepWork',
    descKey: 'onboarding.checklist.tryDeepWorkDesc',
    route: '/',
    icon: Focus,
  },
]

export function OnboardingChecklist() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const {
    checklist,
    checklistDismissed,
    checklistProgress,
    checklistTotal,
    isChecklistComplete,
    dismissChecklist,
  } = useOnboarding()
  const [collapsed, setCollapsed] = useState(false)

  if (checklistDismissed) return null

  const progress = (checklistProgress / checklistTotal) * 100

  return (
    <Card className="relative border-primary/20 bg-card/80 backdrop-blur-sm">
      <button
        onClick={dismissChecklist}
        className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors z-10"
        aria-label={t('common.close')}
      >
        <X className="h-4 w-4" />
      </button>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between pr-6">
          <CardTitle className="flex items-center gap-2 text-base">
            {t('onboarding.checklist.title')}
            {isChecklistComplete && <span className="text-xs text-green-500">({t('onboarding.checklist.allDone')})</span>}
          </CardTitle>
          <button
            onClick={() => setCollapsed((p) => !p)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <Progress value={progress} className="h-2 flex-1" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {checklistProgress}/{checklistTotal}
          </span>
        </div>
      </CardHeader>
      {!collapsed && (
        <CardContent className="space-y-2 pt-0">
          {ITEMS.map((item) => {
            const done = checklist[item.key]
            const Icon = item.icon
            return (
              <button
                key={item.key}
                onClick={() => !done && navigate(item.route)}
                disabled={done}
                className={cn(
                  'flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors',
                  done
                    ? 'opacity-60 cursor-default'
                    : 'hover:bg-muted/50 cursor-pointer'
                )}
              >
                {done ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500 mt-0.5" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0 text-primary" />
                    <span className={cn('text-sm font-medium', done && 'line-through')}>
                      {t(item.titleKey)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{t(item.descKey)}</p>
                </div>
              </button>
            )
          })}
          {isChecklistComplete && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2"
              onClick={dismissChecklist}
            >
              {t('onboarding.checklist.dismiss')}
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  )
}
