import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Play, Pause, RotateCcw, Zap, SkipForward } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useXPSystem } from '@/hooks/useXPSystem'
import { toast } from 'sonner'

const WORK_DURATION = 25 * 60
const BREAK_DURATION = 5 * 60
const LONG_BREAK_DURATION = 15 * 60
const SESSIONS_BEFORE_LONG_BREAK = 4

type TimerMode = 'work' | 'break' | 'longbreak'

interface PomodoroTimerProps {
  onSessionComplete?: (minutes: number) => void
}

function getDuration(m: TimerMode) {
  if (m === 'work') return WORK_DURATION
  if (m === 'longbreak') return LONG_BREAK_DURATION
  return BREAK_DURATION
}

export function PomodoroTimer({ onSessionComplete }: PomodoroTimerProps) {
  const [mode, setMode] = useState<TimerMode>('work')
  const [timeLeft, setTimeLeft] = useState(WORK_DURATION)
  const [isRunning, setIsRunning] = useState(false)
  const [sessionsCompleted, setSessionsCompleted] = useState(0)
  const { awardDeepWork } = useXPSystem()

  const resetTimer = useCallback(() => {
    setIsRunning(false)
    setTimeLeft(getDuration(mode))
  }, [mode])

  const skipToNext = useCallback(() => {
    setIsRunning(false)
    if (mode === 'work') {
      const nextMode: TimerMode = (sessionsCompleted + 1) % SESSIONS_BEFORE_LONG_BREAK === 0 ? 'longbreak' : 'break'
      setMode(nextMode)
      setTimeLeft(getDuration(nextMode))
    } else {
      setMode('work')
      setTimeLeft(WORK_DURATION)
    }
  }, [mode, sessionsCompleted])

  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false)
          if (mode === 'work') {
            const newCount = sessionsCompleted + 1
            setSessionsCompleted(newCount)
            awardDeepWork(25)
            onSessionComplete?.(25)
            toast.success(
              <div className="flex items-center gap-2">
                <span>Focus session #{newCount} complete!</span>
                <Badge variant="secondary" className="gap-1 bg-amber-500/20 text-amber-400">
                  <Zap className="h-3 w-3" />+50 XP
                </Badge>
              </div>
            )
            const nextMode: TimerMode = newCount % SESSIONS_BEFORE_LONG_BREAK === 0 ? 'longbreak' : 'break'
            setMode(nextMode)
            return getDuration(nextMode)
          }
          setMode('work')
          return WORK_DURATION
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isRunning, mode, awardDeepWork, onSessionComplete, sessionsCompleted])

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const totalDuration = getDuration(mode)
  const progress = ((totalDuration - timeLeft) / totalDuration) * 100

  const strokeColor = mode === 'work' ? 'text-primary' : mode === 'longbreak' ? 'text-violet-500' : 'text-emerald-500'
  const modeBg = mode === 'work' ? '' : mode === 'longbreak' ? 'bg-violet-500 hover:bg-violet-600' : 'bg-emerald-500 hover:bg-emerald-600'

  return (
    <Card className="w-full max-w-sm">
      <CardContent className="pt-6">
        <div className="mb-4 flex justify-center gap-2">
          <button onClick={() => { setMode('work'); setTimeLeft(WORK_DURATION); setIsRunning(false) }}
            className={cn('rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              mode === 'work' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
            Focus
          </button>
          <button onClick={() => { setMode('break'); setTimeLeft(BREAK_DURATION); setIsRunning(false) }}
            className={cn('rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              mode === 'break' ? 'bg-emerald-500 text-white' : 'text-muted-foreground hover:text-foreground')}>
            Break
          </button>
          <button onClick={() => { setMode('longbreak'); setTimeLeft(LONG_BREAK_DURATION); setIsRunning(false) }}
            className={cn('rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              mode === 'longbreak' ? 'bg-violet-500 text-white' : 'text-muted-foreground hover:text-foreground')}>
            Long
          </button>
        </div>

        <div className="relative mb-4">
          <svg className="mx-auto h-48 w-48 -rotate-90 transform">
            <circle cx="96" cy="96" r="88" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted" />
            <circle cx="96" cy="96" r="88" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 88} strokeDashoffset={2 * Math.PI * 88 * (1 - progress / 100)}
              className={cn('transition-all duration-1000', strokeColor)} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-5xl font-bold tracking-tight">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
            <span className="mt-1 text-xs text-muted-foreground capitalize">
              {mode === 'longbreak' ? 'Long Break' : mode}
            </span>
          </div>
        </div>

        {/* Session indicators */}
        <div className="mb-4 flex items-center justify-center gap-1.5">
          {Array.from({ length: SESSIONS_BEFORE_LONG_BREAK }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-2 w-2 rounded-full transition-all',
                i < (sessionsCompleted % SESSIONS_BEFORE_LONG_BREAK)
                  ? 'bg-primary scale-110'
                  : 'bg-muted'
              )}
            />
          ))}
          <span className="ml-2 text-xs text-muted-foreground">{sessionsCompleted} done</span>
        </div>

        <div className="flex justify-center gap-3">
          <Button variant="outline" size="icon" onClick={resetTimer} className="h-12 w-12 rounded-full">
            <RotateCcw className="h-5 w-5" />
          </Button>
          <Button size="icon" onClick={() => setIsRunning(!isRunning)}
            className={cn('h-14 w-14 rounded-full', modeBg)}>
            {isRunning ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 pl-0.5" />}
          </Button>
          <Button variant="outline" size="icon" onClick={skipToNext} className="h-12 w-12 rounded-full" title="Skip to next">
            <SkipForward className="h-5 w-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
