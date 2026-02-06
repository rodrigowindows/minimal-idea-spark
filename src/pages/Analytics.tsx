import { WeeklyScorecard } from '@/components/analytics/WeeklyScorecard'
import { ActivityHeatmap } from '@/components/analytics/ActivityHeatmap'
import { XPProgressBar } from '@/components/gamification/XPProgressBar'
import { useXPSystem } from '@/hooks/useXPSystem'
import { useMockData } from '@/hooks/useMockData'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { GAMIFICATION_CONFIG } from '@/lib/constants'
import {
  Trophy, Flame, Brain, Footprints, Scale, Lightbulb, Crown, Star, RotateCcw,
} from 'lucide-react'

const ACHIEVEMENT_ICONS: Record<string, typeof Star> = {
  footprints: Footprints, flame: Flame, brain: Brain, trophy: Trophy,
  scale: Scale, lightbulb: Lightbulb, crown: Crown,
}

export function Analytics() {
  const { opportunities, domains, isLoading } = useMockData()
  const {
    level, xpTotal, levelTitle, achievements, streakDays,
    deepWorkMinutes, opportunitiesCompleted, resetXP,
  } = useXPSystem()

  const allAchievements = GAMIFICATION_CONFIG.ACHIEVEMENTS
  const unlockedNames = new Set(achievements.map(a => a.name))

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="mb-2 text-2xl font-bold tracking-tight md:text-3xl">Analytics</h1>
        <p className="text-muted-foreground">Track your progress and performance metrics</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-6">
          <WeeklyScorecard
            opportunities={isLoading ? undefined : opportunities}
            domains={isLoading ? undefined : domains}
          />
          <ActivityHeatmap />
        </div>

        <div className="space-y-6 lg:col-span-4">
          <Card className="rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Star className="h-5 w-5 text-amber-400" />Level Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-orange-500/25">
                  <span className="text-3xl font-bold text-white">{level}</span>
                </div>
                <div>
                  <p className="text-xl font-semibold">{levelTitle}</p>
                  <p className="text-sm text-muted-foreground">{xpTotal.toLocaleString()} Total XP</p>
                  <p className="text-xs text-muted-foreground">Next: {GAMIFICATION_CONFIG.XP_FOR_LEVEL(level).toLocaleString()} XP</p>
                </div>
              </div>
              <XPProgressBar />
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-muted/50 p-2">
                  <div className="flex items-center justify-center gap-1 text-orange-400">
                    <Flame className="h-4 w-4" /><span className="text-lg font-bold">{streakDays}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Streak</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-2">
                  <div className="flex items-center justify-center gap-1 text-green-400">
                    <Trophy className="h-4 w-4" /><span className="text-lg font-bold">{opportunitiesCompleted}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Done</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-2">
                  <div className="flex items-center justify-center gap-1 text-purple-400">
                    <Brain className="h-4 w-4" /><span className="text-lg font-bold">{Math.floor(deepWorkMinutes / 60)}h</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Focus</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-lg">
                <span className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-purple-400" />Achievements
                </span>
                <Badge variant="secondary">{achievements.length}/{allAchievements.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {allAchievements.map((def) => {
                const isUnlocked = unlockedNames.has(def.name)
                const IconComponent = ACHIEVEMENT_ICONS[def.icon] || Trophy
                return (
                  <div key={def.name}
                    className={`flex items-center gap-3 rounded-lg p-2 transition-colors ${
                      isUnlocked ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20' : 'bg-muted/30 opacity-50'}`}>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      isUnlocked ? 'bg-gradient-to-br from-purple-500 to-pink-500' : 'bg-muted'}`}>
                      <IconComponent className={`h-5 w-5 ${isUnlocked ? 'text-white' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${isUnlocked ? '' : 'text-muted-foreground'}`}>{def.name}</p>
                      <p className="text-xs text-muted-foreground">{def.description}</p>
                    </div>
                    <Badge variant={isUnlocked ? 'default' : 'outline'} className="text-xs">+{def.xp_reward} XP</Badge>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Button variant="outline" className="w-full gap-2 text-muted-foreground" onClick={resetXP}>
            <RotateCcw className="h-4 w-4" />Reset Progress (Dev)
          </Button>
        </div>
      </div>
    </div>
  )
}
