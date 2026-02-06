import { useCallback, useMemo } from 'react'
import { SmartCapture } from '@/components/smart-capture/SmartCapture'
import { TheOneThing } from '@/components/war-room/TheOneThing'
import { OpportunityRadar } from '@/components/war-room/OpportunityRadar'
import { EnergyBalance } from '@/components/war-room/EnergyBalance'
import { QuickJournal } from '@/components/war-room/QuickJournal'
import { XPStatusWidget } from '@/components/gamification/XPStatusWidget'
import { TimeBlockCalendar } from '@/components/time-blocking/TimeBlockCalendar'
import { ActivityHeatmap } from '@/components/analytics/ActivityHeatmap'
import { useLocalData } from '@/hooks/useLocalData'
import { useXPSystem } from '@/hooks/useXPSystem'
import type { OpportunityTypeValue } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Flame, Zap, Target, Brain } from 'lucide-react'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 6) return 'Night owl mode'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function Dashboard() {
  const { opportunities, domains, isLoading, addOpportunity } = useLocalData()
  const { level, levelTitle, streakDays, xpTotal, deepWorkMinutes, opportunitiesCompleted } = useXPSystem()

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

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <header className="mb-8">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              {getGreeting()} <span className="text-gradient">Commander</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Level {level} {levelTitle} &middot; {xpTotal.toLocaleString()} XP
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
              <Flame className="h-3.5 w-3.5 text-orange-400" />
              <span className="font-semibold">{streakDays}</span> day streak
            </Badge>
            <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
              <Target className="h-3.5 w-3.5 text-green-400" />
              <span className="font-semibold">{doingCount}</span> in progress
            </Badge>
            <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
              <Brain className="h-3.5 w-3.5 text-purple-400" />
              <span className="font-semibold">{Math.floor(deepWorkMinutes / 60)}h</span> focus
            </Badge>
          </div>
        </div>
        <SmartCapture onCapture={handleCapture} />
      </header>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-12">
        {/* Row 1: The One Thing + Radar + XP Status */}
        <div className="lg:col-span-6">
          <TheOneThing
            opportunities={isLoading ? undefined : opportunities}
            domains={isLoading ? undefined : domains}
          />
        </div>
        <div className="lg:col-span-3">
          <OpportunityRadar
            opportunities={isLoading ? undefined : opportunities}
            domains={isLoading ? undefined : domains}
          />
        </div>
        <div className="lg:col-span-3">
          <XPStatusWidget />
        </div>

        {/* Row 2: Time Blocking + Energy Balance + Quick Journal */}
        <div className="lg:col-span-6">
          <TimeBlockCalendar opportunities={isLoading ? undefined : opportunities} />
        </div>
        <div className="lg:col-span-3">
          <EnergyBalance
            opportunities={isLoading ? undefined : opportunities}
            domains={isLoading ? undefined : domains}
          />
        </div>
        <div className="lg:col-span-3">
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
