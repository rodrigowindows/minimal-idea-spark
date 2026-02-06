import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Grid3x3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6) // 6am-9pm
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const INTENSITY_COLORS = [
  'bg-muted/30',
  'bg-emerald-500/20',
  'bg-emerald-500/40',
  'bg-emerald-500/60',
  'bg-emerald-500/90',
]

interface ActivityHeatmapProps {
  className?: string
}

export function ActivityHeatmap({ className }: ActivityHeatmapProps) {
  // Generate mock heatmap data based on realistic patterns
  const heatmapData = useMemo(() => {
    const data: Record<string, number> = {}
    DAYS.forEach((day, dayIdx) => {
      HOURS.forEach((hour) => {
        const key = `${day}-${hour}`
        let intensity = 0

        // Morning focus (8-12) higher intensity
        if (hour >= 8 && hour <= 11) {
          intensity = Math.floor(Math.random() * 3) + 2
        }
        // Afternoon (13-17) medium
        else if (hour >= 13 && hour <= 17) {
          intensity = Math.floor(Math.random() * 3) + 1
        }
        // Evening (18-21) lower
        else if (hour >= 18) {
          intensity = Math.floor(Math.random() * 2)
        }
        // Early morning (6-7) occasional
        else {
          intensity = Math.random() > 0.7 ? 1 : 0
        }

        // Weekend is lighter
        if (dayIdx >= 5) {
          intensity = Math.max(0, intensity - 1)
        }

        data[key] = Math.min(intensity, 4)
      })
    })
    return data
  }, [])

  return (
    <Card className={cn('rounded-xl', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Grid3x3 className="h-5 w-5 text-primary" />
          Activity Heatmap
        </CardTitle>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="overflow-x-auto">
            {/* Hour labels */}
            <div className="flex gap-[2px] pl-10 mb-1">
              {HOURS.map((hour) => (
                <div key={hour} className="w-5 text-center text-[9px] text-muted-foreground">
                  {hour % 3 === 0 ? (hour > 12 ? `${hour - 12}p` : `${hour}a`) : ''}
                </div>
              ))}
            </div>

            {/* Grid */}
            {DAYS.map((day) => (
              <div key={day} className="flex items-center gap-[2px] mb-[2px]">
                <span className="w-8 text-right text-[10px] text-muted-foreground pr-1">
                  {day}
                </span>
                {HOURS.map((hour) => {
                  const intensity = heatmapData[`${day}-${hour}`] || 0
                  return (
                    <Tooltip key={`${day}-${hour}`}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            'h-5 w-5 rounded-[3px] transition-colors cursor-pointer hover:ring-1 hover:ring-primary/50',
                            INTENSITY_COLORS[intensity]
                          )}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        <p>{day} {hour > 12 ? `${hour - 12}PM` : `${hour}AM`}</p>
                        <p className="text-muted-foreground">
                          {intensity === 0 && 'No activity'}
                          {intensity === 1 && 'Light activity'}
                          {intensity === 2 && 'Moderate activity'}
                          {intensity === 3 && 'High activity'}
                          {intensity === 4 && 'Peak productivity'}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            ))}

            {/* Legend */}
            <div className="mt-3 flex items-center gap-2 justify-end">
              <span className="text-[10px] text-muted-foreground">Less</span>
              {INTENSITY_COLORS.map((color, i) => (
                <div key={i} className={cn('h-3 w-3 rounded-sm', color)} />
              ))}
              <span className="text-[10px] text-muted-foreground">More</span>
            </div>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  )
}
