import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Play, Pause, RotateCcw, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useXPSystem } from '@/hooks/useXPSystem'
import { toast } from 'sonner'

const WORK_DURATION = 25 * 60
const BREAK_DURATION = 5 * 60

type TimerMode = 'work' | 'break'

interface PomodoroTimerProps {
  onSessionComplete?: (minutes: number) => void
}

export function PomodoroTimer({ onSessionComplete }: PomodoroTimerProps) {
  const [mode, setMode] = useState<TimerMode>('work')
  const [timeLeft, setTimeLeft] = useState(WORK_DURATION)
  const [isRunning, setIsRunning] = useState(false)
  const { awardDeepWork } = useXPSystem()

  const resetTimer = useCallback(() => {
    setIsRunning(false)
    setTimeLeft(mode === 'work' ? WORK_DURATION : BREAK_DURATION)
  }, [mode])

  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false)
          if (mode === 'work') {
            awardDeepWork(25)
            onSessionComplete?.(25)
            toast.success(
              <div className="flex items-center gap-2">
                <span>Focus session complete!</span>
                <Badge variant="secondary" className="gap-1 bg-amber-500/20 text-amber-400">
                  <Zap className="h-3 w-3" />+50 XP
                </Badge>
              </div>
            )
          }
          const newMode = mode === 'work' ? 'break' : 'work'
          setMode(newMode)
          return newMode === 'work' ? WORK_DURATION : BREAK_DURATION
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isRunning, mode, awardDeepWork, onSessionComplete])

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const totalDuration = mode === 'work' ? WORK_DURATION : BREAK_DURATION
  const progress = ((totalDuration - timeLeft) / totalDuration) * 100

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
        </div>

        <div className="relative mb-6">
          <svg className="mx-auto h-48 w-48 -rotate-90 transform">
            <circle cx="96" cy="96" r="88" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted" />
            <circle cx="96" cy="96" r="88" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 88} strokeDashoffset={2 * Math.PI * 88 * (1 - progress / 100)}
              className={cn('transition-all duration-1000', mode === 'work' ? 'text-primary' : 'text-emerald-500')} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-5xl font-bold tracking-tight">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>
        </div>

        <div className="flex justify-center gap-3">
          <Button variant="outline" size="icon" onClick={resetTimer} className="h-12 w-12 rounded-full">
            <RotateCcw className="h-5 w-5" />
          </Button>
          <Button size="icon" onClick={() => setIsRunning(!isRunning)}
            className={cn('h-14 w-14 rounded-full', mode === 'break' && 'bg-emerald-500 hover:bg-emerald-600')}>
            {isRunning ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 pl-0.5" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
