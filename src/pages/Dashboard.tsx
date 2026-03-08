import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
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
import { AnimatedStatCard } from '@/components/dashboard/AnimatedStatCard'
import { WeeklyProductivityChart } from '@/components/dashboard/WeeklyProductivityChart'
import { DomainDistribution } from '@/components/dashboard/DomainDistribution'
import { useLocalData } from '@/hooks/useLocalData'
import { useXPSystem } from '@/hooks/useXPSystem'
import { useTranslation } from '@/contexts/LanguageContext'
import type { WidgetId } from '@/contexts/WarRoomLayoutContext'
import type { OpportunityTypeValue } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Flame, Target, Brain, SlidersHorizontal, Lightbulb, BookOpen, CheckSquare,
  ArrowRight, Zap, Trophy,
} from 'lucide-react'
import { PageContent } from '@/components/layout/PageContent'

function NewUserWelcome() {
  const navigate = useNavigate()

  const quickActions = [
    {
      icon: Lightbulb,
      title: 'Create your first opportunity',
      description: 'Track tasks, ideas, and goals in one place',
      action: () => navigate('/opportunities'),
      gradientFrom: 'from-amber-500',
      gradientTo: 'to-orange-500',
    },
    {
      icon: Target,
      title: 'Set a goal',
      description: 'Define OKRs and milestones to stay focused',
      action: () => navigate('/goals'),
      gradientFrom: 'from-emerald-500',
      gradientTo: 'to-green-500',
    },
    {
      icon: BookOpen,
      title: 'Write in your journal',
      description: 'Track mood, energy, and daily reflections',
      action: () => navigate('/journal'),
      gradientFrom: 'from-blue-500',
      gradientTo: 'to-cyan-500',
    },
    {
      icon: CheckSquare,
      title: 'Build a habit',
      description: 'Create daily or weekly habits with streaks',
      action: () => navigate('/habits'),
      gradientFrom: 'from-purple-500',
      gradientTo: 'to-pink-500',
    },
  ]

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 p-6"
      >
        <h2 className="text-lg font-semibold mb-1">Welcome to LifeOS 🚀</h2>
        <p className="text-sm text-muted-foreground">
          Your personal command center for goals, habits, and productivity. Start by picking one of these:
        </p>
      </motion.div>
      <div className="grid gap-3 sm:grid-cols-2">
        {quickActions.map((action, i) => (
          <motion.div
            key={action.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 + i * 0.1 }}
          >
            <Card
              className="cursor-pointer transition-all hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30 group"
              onClick={action.action}
            >
              <CardContent className="flex items-start gap-3 p-4">
                <div className={`rounded-lg p-2 bg-gradient-to-br ${action.gradientFrom} ${action.gradientTo} shadow-sm`}>
                  <action.icon className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{action.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1 transition-transform group-hover:translate-x-1" />
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

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

  const doneCount = useMemo(() => {
    if (!opportunities) return 0
    return opportunities.filter(o => o.status === 'done').length
  }, [opportunities])

  const isNewUser = useMemo(() => {
    if (isLoading) return false
    return !opportunities || opportunities.length === 0
  }, [isLoading, opportunities])

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
    <PageContent>
      {/* Hero header with greeting */}
      <header className="mb-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between"
        >
          <div>
            <h1 tabIndex={-1} className="text-2xl font-bold tracking-tight md:text-3xl outline-none">
              {getGreeting()} <span className="text-gradient">{t('dashboard.commander')}</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('dashboard.level')} {level} {levelTitle} &middot; {xpTotal.toLocaleString()} XP
            </p>
          </div>
          {!isNewUser && (
            <div className="flex flex-wrap items-center gap-2">
              <SmartCapture onCapture={handleCapture} />
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setCustomizeOpen(true)}>
                <SlidersHorizontal className="h-4 w-4" />
                {t('dashboard.customizeWarRoom')}
              </Button>
            </div>
          )}
        </motion.div>

        {/* Animated stat cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <AnimatedStatCard
            icon={Flame}
            label={t('dashboard.dayStreak')}
            value={streakDays}
            suffix=" days"
            color="text-orange-400"
            gradientFrom="from-orange-500"
            gradientTo="to-amber-500"
            delay={0}
          />
          <AnimatedStatCard
            icon={Target}
            label={t('dashboard.inProgress')}
            value={doingCount}
            color="text-emerald-400"
            gradientFrom="from-emerald-500"
            gradientTo="to-green-500"
            delay={100}
          />
          <AnimatedStatCard
            icon={Brain}
            label={t('dashboard.focus')}
            value={Math.floor(deepWorkMinutes / 60)}
            suffix="h"
            color="text-purple-400"
            gradientFrom="from-purple-500"
            gradientTo="to-pink-500"
            delay={200}
          />
          <AnimatedStatCard
            icon={Trophy}
            label={t('dashboard.completed')}
            value={doneCount}
            color="text-primary"
            gradientFrom="from-blue-500"
            gradientTo="to-cyan-500"
            delay={300}
          />
        </div>
      </header>

      {isNewUser ? (
        <NewUserWelcome />
      ) : (
        <div className="space-y-8">
          {/* Charts row */}
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <WeeklyProductivityChart />
            </div>
            <div className="lg:col-span-2">
              <DomainDistribution
                opportunities={isLoading ? undefined : opportunities}
                domains={isLoading ? undefined : domains}
              />
            </div>
          </div>

          {/* Widget grid */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            id="main-content"
          >
            <WidgetGrid>
              {(widgetId) => renderWidget(widgetId)}
            </WidgetGrid>
          </motion.div>
        </div>
      )}

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
    </PageContent>
  )
}
