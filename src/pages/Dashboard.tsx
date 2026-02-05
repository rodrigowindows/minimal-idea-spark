import { SmartCapture } from '@/components/smart-capture/SmartCapture'
import { TheOneThing } from '@/components/war-room/TheOneThing'
import { OpportunityRadar } from '@/components/war-room/OpportunityRadar'
import { EnergyBalance } from '@/components/war-room/EnergyBalance'
import { QuickJournal } from '@/components/war-room/QuickJournal'
import { XPStatusWidget } from '@/components/gamification/XPStatusWidget'
import { TimeBlockCalendar } from '@/components/time-blocking/TimeBlockCalendar'
import { useMockData } from '@/hooks/useMockData'

export function Dashboard() {
  const { opportunities, domains, isLoading } = useMockData()

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      {/* Smart Capture Header */}
      <header className="mb-8">
        <h1 className="mb-4 text-2xl font-bold tracking-tight md:text-3xl">
          War Room
        </h1>
        <SmartCapture />
      </header>

      {/* Bento Grid Layout 2.0 */}
      <div className="grid gap-4 md:gap-6 lg:grid-cols-12">
        {/* Row 1: The One Thing (6 cols) + Radar (3 cols) + XP Status (3 cols) */}
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

        {/* Row 2: Time Blocking (6 cols) + Energy Balance (3 cols) + Quick Journal (3 cols) */}
        <div className="lg:col-span-6">
          <TimeBlockCalendar
            opportunities={isLoading ? undefined : opportunities}
          />
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
      </div>
    </div>
  )
}
