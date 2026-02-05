import { useXPSystem } from '@/hooks/useXPSystem'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GAMIFICATION_CONFIG } from '@/lib/constants'
import { Flame, Star, Trophy, Target, Zap, Brain, Lightbulb, Crown, Footprints, Scale } from 'lucide-react'
import { cn } from '@/lib/utils'

const ACHIEVEMENT_ICONS: Record<string, typeof Star> = {
  footprints: Footprints,
  flame: Flame,
  brain: Brain,
  trophy: Trophy,
  scale: Scale,
  lightbulb: Lightbulb,
  crown: Crown,
}

export function XPStatusWidget() {
  const {
    level,
    xpTotal,
    xpCurrentLevel,
    xpToNextLevel,
    xpProgress,
    levelTitle,
    streakDays,
    achievements,
    deepWorkMinutes,
    opportunitiesCompleted,
  } = useXPSystem()

  const deepWorkHours = Math.floor(deepWorkMinutes / 60)
  const deepWorkMins = deepWorkMinutes % 60

  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="h-5 w-5 text-amber-400" />
          XP Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Level Badge */}
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-orange-500/25">
            <span className="text-2xl font-bold text-white">{level}</span>
          </div>
          <div>
            <p className="text-lg font-semibold">{levelTitle}</p>
            <p className="text-sm text-muted-foreground">{xpTotal.toLocaleString()} Total XP</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Level {level + 1}</span>
            <span className="font-medium">{xpCurrentLevel}/{xpToNextLevel}</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 transition-all duration-500"
              style={{ width: `${xpProgress}%` }}
            />
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-muted/50 p-2 text-center">
            <div className="flex items-center justify-center gap-1 text-orange-400">
              <Flame className="h-4 w-4" />
              <span className="text-lg font-bold">{streakDays}</span>
            </div>
            <p className="text-xs text-muted-foreground">Streak</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2 text-center">
            <div className="flex items-center justify-center gap-1 text-green-400">
              <Target className="h-4 w-4" />
              <span className="text-lg font-bold">{opportunitiesCompleted}</span>
            </div>
            <p className="text-xs text-muted-foreground">Done</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2 text-center">
            <div className="flex items-center justify-center gap-1 text-purple-400">
              <Brain className="h-4 w-4" />
              <span className="text-lg font-bold">{deepWorkHours}h{deepWorkMins > 0 ? `${deepWorkMins}m` : ''}</span>
            </div>
            <p className="text-xs text-muted-foreground">Focus</p>
          </div>
        </div>

        {/* Recent Achievements */}
        {achievements.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Achievements</p>
            <div className="flex flex-wrap gap-1.5">
              {achievements.slice(-5).map((achievement) => {
                const IconComponent = ACHIEVEMENT_ICONS[achievement.icon] || Trophy
                return (
                  <Badge
                    key={achievement.id}
                    variant="secondary"
                    className="gap-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20"
                  >
                    <IconComponent className="h-3 w-3" />
                    {achievement.name}
                  </Badge>
                )
              })}
            </div>
          </div>
        )}

        {/* Locked Achievements Preview */}
        {achievements.length < GAMIFICATION_CONFIG.ACHIEVEMENTS.length && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Next Achievements</p>
            <div className="flex gap-1.5">
              {GAMIFICATION_CONFIG.ACHIEVEMENTS
                .filter(def => !achievements.some(a => a.name === def.name))
                .slice(0, 3)
                .map((def) => {
                  const IconComponent = ACHIEVEMENT_ICONS[def.icon] || Trophy
                  return (
                    <div
                      key={def.name}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-muted opacity-40"
                      title={`${def.name}: ${def.description}`}
                    >
                      <IconComponent className="h-4 w-4" />
                    </div>
                  )
                })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
