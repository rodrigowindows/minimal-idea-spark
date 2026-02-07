import { useCallback, useMemo } from 'react'
import { SmartCapture } from '@/components/smart-capture/SmartCapture'
import { TheOneThing } from '@/components/war-room/TheOneThing'
import { OpportunityRadar } from '@/components/war-room/OpportunityRadar'
import { QuickJournal } from '@/components/war-room/QuickJournal'
import { TimeBlockCalendar } from '@/components/time-blocking/TimeBlockCalendar'
import { ActivityHeatmap } from '@/components/analytics/ActivityHeatmap'
import { useLocalData } from '@/hooks/useLocalData'
import { useXPSystem } from '@/hooks/useXPSystem'
import { useTranslation } from '@/contexts/LanguageContext'
import type { OpportunityTypeValue } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Flame, Target, Brain } from 'lucide-react'

export function Dashboard() {
  const { opportunities, domains, isLoading, addOpportunity } = useLocalData()
  const { level, levelTitle, streakDays, xpTotal, deepWorkMinutes } = useXPSystem()
  const { t } = useTranslation()

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
    if (hour < 6) return t.nightOwlMode
    if (hour < 12) return t.goodMorning
    if (hour < 18) return t.goodAfternoon
    return t.goodEvening
  }

  return (
    <div className="min-h-screen p-6 md:p-8 lg:p-10">
      <header className="mb-10">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              {getGreeting()} <span className="text-gradient">{t.commander}</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t.level} {level} {levelTitle} &middot; {xpTotal.toLocaleString()} XP
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
              <Flame className="h-3.5 w-3.5 text-orange-400" />
              <span className="font-semibold">{streakDays}</span> {t.dayStreak}
            </Badge>
            <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
              <Target className="h-3.5 w-3.5 text-green-400" />
              <span className="font-semibold">{doingCount}</span> {t.inProgress}
            </Badge>
            <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
              <Brain className="h-3.5 w-3.5 text-purple-400" />
              <span className="font-semibold">{Math.floor(deepWorkMinutes / 60)}h</span> {t.focus}
            </Badge>
          </div>
        </div>
        <SmartCapture onCapture={handleCapture} />
      </header>

      <div className="grid gap-6 md:gap-8 lg:grid-cols-12">
        {/* Row 1: The One Thing (hero size) + Radar */}
        <div className="lg:col-span-8">
          <TheOneThing
            opportunities={isLoading ? undefined : opportunities}
            domains={isLoading ? undefined : domains}
          />
        </div>
        <div className="lg:col-span-4">
          <OpportunityRadar
            opportunities={isLoading ? undefined : opportunities}
            domains={isLoading ? undefined : domains}
          />
        </div>

        {/* Row 2: Time Blocking + Quick Journal */}
        <div className="lg:col-span-8">
          <TimeBlockCalendar opportunities={isLoading ? undefined : opportunities} />
        </div>
        <div className="lg:col-span-4">
          <QuickJournal />
        </div>

        {/* Row 3: Activity Heatmap */}
        <div className="lg:col-span-12">
          <ActivityHeatmap />
        </div>
      </div>
    </div>
  )
}
