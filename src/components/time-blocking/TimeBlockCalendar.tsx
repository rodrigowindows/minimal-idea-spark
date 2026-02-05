import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTimeBlocking } from '@/hooks/useTimeBlocking'
import { useXPSystem } from '@/hooks/useXPSystem'
import { TIME_BLOCK_DEFAULTS } from '@/lib/constants'
import type { Opportunity } from '@/types'
import { cn } from '@/lib/utils'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Trash2,
  Play,
  Square,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'

interface TimeBlockCalendarProps {
  opportunities?: Opportunity[]
  className?: string
}

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6) // 6 AM to 10 PM

export function TimeBlockCalendar({ opportunities, className }: TimeBlockCalendarProps) {
  const {
    blocks,
    selectedDate,
    setSelectedDate,
    addBlock,
    removeBlock,
    getBlocksTotal,
  } = useTimeBlocking()

  const { awardDeepWork } = useXPSystem()

  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)
  const [timerSeconds, setTimerSeconds] = useState(0)

  const totalMinutes = getBlocksTotal()
  const totalHours = Math.floor(totalMinutes / 60)
  const totalMins = totalMinutes % 60

  const dateDisplay = useMemo(() => {
    const date = new Date(selectedDate)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    })
  }, [selectedDate])

  function navigateDate(delta: number) {
    const current = new Date(selectedDate)
    current.setDate(current.getDate() + delta)
    setSelectedDate(current.toISOString().split('T')[0])
  }

  function handleAddBlock(hour: number) {
    const startTime = `${hour.toString().padStart(2, '0')}:00`
    addBlock(startTime, TIME_BLOCK_DEFAULTS.DEFAULT_DURATION)
    toast.success('Time block added!')
  }

  function handleRemoveBlock(blockId: string) {
    removeBlock(blockId)
    toast.success('Time block removed')
  }

  function handleStartTimer(blockId: string, duration: number) {
    setActiveBlockId(blockId)
    setTimerSeconds(duration * 60)

    // Simple countdown (in production, use a proper timer with Web Workers)
    const interval = setInterval(() => {
      setTimerSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          setActiveBlockId(null)
          awardDeepWork(duration)
          toast.success(
            <div className="flex items-center gap-2">
              <span>Deep work session complete!</span>
              <Badge variant="secondary" className="gap-1 bg-amber-500/20 text-amber-400">
                <Zap className="h-3 w-3" />
                +{Math.floor(duration / 25) * 50} XP
              </Badge>
            </div>
          )
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  function handleStopTimer() {
    setActiveBlockId(null)
    setTimerSeconds(0)
  }

  function formatTimer(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return (
    <Card className={cn('rounded-xl', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            Time Blocking
          </CardTitle>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            {totalHours}h {totalMins}m scheduled
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigateDate(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">{dateDisplay}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigateDate(1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Timeline */}
        <div className="max-h-[400px] space-y-1 overflow-y-auto">
          {HOURS.map((hour) => {
            const timeStr = `${hour.toString().padStart(2, '0')}:00`
            const blocksAtHour = blocks.filter(b => {
              const blockHour = parseInt(b.block_start.split(':')[0], 10)
              return blockHour === hour
            })

            return (
              <div
                key={hour}
                className="group flex items-stretch gap-2 rounded-lg px-2 py-1 hover:bg-muted/50"
              >
                {/* Hour label */}
                <div className="w-12 shrink-0 pt-1 text-xs text-muted-foreground">
                  {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                </div>

                {/* Blocks */}
                <div className="flex min-h-[40px] flex-1 flex-col gap-1">
                  {blocksAtHour.length > 0 ? (
                    blocksAtHour.map((block) => (
                      <div
                        key={block.id}
                        className={cn(
                          'flex items-center justify-between rounded-lg px-3 py-2 text-sm',
                          block.opportunity
                            ? 'bg-primary/20 text-primary'
                            : 'bg-muted',
                          activeBlockId === block.id && 'ring-2 ring-primary'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {block.opportunity?.title || 'Free block'}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {block.block_duration}min
                          </Badge>
                        </div>

                        <div className="flex items-center gap-1">
                          {activeBlockId === block.id ? (
                            <>
                              <span className="mr-2 font-mono text-sm">
                                {formatTimer(timerSeconds)}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={handleStopTimer}
                              >
                                <Square className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleStartTimer(block.id, block.block_duration)}
                              >
                                <Play className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive"
                                onClick={() => handleRemoveBlock(block.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <button
                      onClick={() => handleAddBlock(hour)}
                      className="flex h-full min-h-[32px] w-full items-center justify-center rounded-lg border border-dashed border-border/50 text-muted-foreground opacity-0 transition-opacity hover:border-primary/50 hover:text-primary group-hover:opacity-100"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Quick Add Opportunities */}
        {opportunities && opportunities.length > 0 && (
          <div className="space-y-2 border-t border-border/50 pt-4">
            <p className="text-xs font-medium text-muted-foreground">
              Drag opportunities to schedule
            </p>
            <div className="flex flex-wrap gap-2">
              {opportunities
                .filter(o => o.status === 'doing' || o.status === 'backlog')
                .slice(0, 4)
                .map((opp) => (
                  <div
                    key={opp.id}
                    className="cursor-grab rounded-lg border border-border/50 bg-card px-2 py-1 text-xs"
                    title={opp.title}
                  >
                    {opp.title.length > 20 ? `${opp.title.slice(0, 20)}...` : opp.title}
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
