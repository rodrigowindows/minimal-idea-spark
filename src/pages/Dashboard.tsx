import { useCallback, useMemo, useState } from 'react'
import { SmartCapture } from '@/components/smart-capture/SmartCapture'
import { TheOneThing } from '@/components/war-room/TheOneThing'
import { OpportunityRadar } from '@/components/war-room/OpportunityRadar'
import { QuickJournal } from '@/components/war-room/QuickJournal'
import { TimeBlockCalendar } from '@/components/time-blocking/TimeBlockCalendar'
import { ActivityHeatmap } from '@/components/analytics/ActivityHeatmap'
import { GoalsWidget } from '@/components/war-room/GoalsWidget'
import { WidgetGrid } from '@/components/WarRoom/WidgetGrid'
import { CustomizeWarRoomModal } from '@/components/WarRoom/CustomizeWarRoomModal'
import { OnboardingChecklist } from '@/components/Onboarding/OnboardingChecklist'
import { ContextualTip } from '@/components/Onboarding/ContextualTip'
import { useLocalData } from '@/hooks/useLocalData'
import { useXPSystem } from '@/hooks/useXPSystem'
import { useTranslation } from '@/contexts/LanguageContext'
import type { WidgetId } from '@/contexts/WarRoomLayoutContext'
import type { OpportunityTypeValue } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Flame, Target, Brain, SlidersHorizontal } from 'lucide-react'

export function Dashboard() {
  const { opportunities, domains, isLoading, addOpportunity } = useLocalData()
  const { level, levelTitle, streakDays, xpTotal, deepWorkMinutes } = useXPSystem()
  const { t } = useTranslation()
  const [customizeOpen, setCustomizeOpen] = useState(false)

  const handleCapture = useCallback((data: { title: string; type: string; domain: string; strategicValue: number }) => {
    const domainObj = domains.find(d => d.name === data.domain)
    addOpportunity({
      title: data.title,
      description: null,
      type: data.type as OpportunityTypeValue,
      status: 'backlog',
      priority: Math.min(data.strategicValue, 10),
      strategic_value: data.strategicValue,
      domain_id: domainObj?.id ?? null,
    })
  }, [domains, addOpportunity])

  const doingCount = useMemo(() => {
    if (!opportunities) return 0
    return opportunities.filter(o => o.status === 'doing').length
  }, [opportunities])

  function getGreeting(): string {
    const hour = new Date().getHours()
    if (hour < 6) return t('dashboard.nightOwlMode')
    if (hour < 12) return t('dashboard.goodMorning')
    if (hour < 18) return t('dashboard.goodAfternoon')
    return t('dashboard.goodEvening')
  }

  const renderWidget = useCallback((widgetId: WidgetId) => {
    switch (widgetId) {
      case 'smart-capture':
        return null
      case 'the-one-thing':
        return (
          <TheOneThing
            opportunities={isLoading ? undefined : opportunities}
            domains={isLoading ? undefined : domains}
          />
        )
      case 'opportunity-radar':
        return (
          <OpportunityRadar
            opportunities={isLoading ? undefined : opportunities}
            domains={isLoading ? undefined : domains}
          />
        )
      case 'time-blocking':
        return <TimeBlockCalendar opportunities={isLoading ? undefined : opportunities} />
      case 'quick-journal':
        return <QuickJournal />
      case 'activity-heatmap':
        return <ActivityHeatmap />
      case 'goals-okr':
        return <GoalsWidget />
      default:
        return null
    }
  }, [isLoading, opportunities, domains])

  return (
    <div className="min-h-screen p-6 md:p-8 lg:p-10">
      <header className="mb-10">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              {getGreeting()} <span className="text-gradient">{t('dashboard.commander')}</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('dashboard.level')} {level} {levelTitle} &middot; {xpTotal.toLocaleString()} XP
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
              <Flame className="h-3.5 w-3.5 text-orange-400" />
              <span className="font-semibold">{streakDays}</span> {t('dashboard.dayStreak')}
            </Badge>
            <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
              <Target className="h-3.5 w-3.5 text-green-400" />
              <span className="font-semibold">{doingCount}</span> {t('dashboard.inProgress')}
            </Badge>
            <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
              <Brain className="h-3.5 w-3.5 text-purple-400" />
              <span className="font-semibold">{Math.floor(deepWorkMinutes / 60)}h</span> {t('dashboard.focus')}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SmartCapture onCapture={handleCapture} />
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setCustomizeOpen(true)}>
            <SlidersHorizontal className="h-4 w-4" />
            {t('dashboard.customizeWarRoom')}
          </Button>
        </div>
      </header>

      <div id="main-content">
        <WidgetGrid>
          {(widgetId) => renderWidget(widgetId)}
        </WidgetGrid>
      </div>

      <div className="mt-8">
        <OnboardingChecklist />
      </div>

      <ContextualTip
        tipId="deep-work"
        titleKey="onboarding.contextualTips.deepWorkTitle"
        descriptionKey="onboarding.contextualTips.deepWorkDesc"
        className="mt-6"
      />

      <CustomizeWarRoomModal open={customizeOpen} onOpenChange={setCustomizeOpen} />
    </div>
  )
}
