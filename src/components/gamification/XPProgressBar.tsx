import { useXPSystem } from '@/hooks/useXPSystem'
import { cn } from '@/lib/utils'
import { Flame, Star, Trophy, Zap } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface XPProgressBarProps {
  compact?: boolean
  className?: string
}

export function XPProgressBar({ compact = false, className }: XPProgressBarProps) {
  const {
    level,
    xpCurrentLevel,
    xpToNextLevel,
    xpProgress,
    levelTitle,
    streakDays,
  } = useXPSystem()

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn('flex items-center gap-2 cursor-pointer', className)}>
              <div className="flex items-center gap-1">
                <Zap className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-semibold">{level}</span>
              </div>
              <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
              {streakDays > 0 && (
                <div className="flex items-center gap-0.5 text-orange-400">
                  <Flame className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">{streakDays}</span>
                </div>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">{levelTitle} - Level {level}</p>
            <p className="text-xs opacity-80">
              {xpCurrentLevel}/{xpToNextLevel} XP to next level
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <div className={cn('rounded-xl border border-border/50 bg-card/50 p-4', className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500">
            <span className="text-lg font-bold text-white">{level}</span>
          </div>
          <div>
            <p className="text-sm font-semibold">{levelTitle}</p>
            <p className="text-xs text-muted-foreground">Level {level}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {streakDays > 0 && (
            <div className="flex items-center gap-1 text-orange-400">
              <Flame className="h-5 w-5" />
              <span className="text-sm font-semibold">{streakDays} day{streakDays !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Progress to Level {level + 1}</span>
          <span className="font-medium">{xpCurrentLevel}/{xpToNextLevel} XP</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 transition-all duration-500 ease-out"
            style={{ width: `${xpProgress}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export function XPBadge() {
  const { level, levelTitle } = useXPSystem()

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400/20 to-orange-500/20 px-3 py-1 cursor-pointer">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span className="text-sm font-semibold">{level}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{levelTitle}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function AchievementToast({ name, xpReward }: { name: string; xpReward: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
        <Trophy className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="font-semibold">Achievement Unlocked!</p>
        <p className="text-sm text-muted-foreground">{name} - +{xpReward} XP</p>
      </div>
    </div>
  )
}
