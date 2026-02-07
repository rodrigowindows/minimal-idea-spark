import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Plus, Clock } from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  isSameDay,
  isSameMonth,
  parseISO,
  getHours,
  getMinutes,
} from 'date-fns'
import { ptBR } from 'date-fns/locale/pt-BR'
import type { CalendarEvent } from '@/types'

interface CalendarViewProps {
  events: CalendarEvent[]
  onDateSelect?: (date: Date) => void
  onEventClick?: (event: CalendarEvent) => void
  onNewEvent?: () => void
  getWorkload?: (date: Date) => { level: 'light' | 'moderate' | 'heavy'; utilizationPercent: number }
}

type ViewMode = 'month' | 'week' | 'day'

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6) // 6:00 - 21:00

function getWorkloadColor(level: 'light' | 'moderate' | 'heavy') {
  switch (level) {
    case 'light': return 'bg-green-500/10'
    case 'moderate': return 'bg-yellow-500/10'
    case 'heavy': return 'bg-red-500/10'
  }
}

export function CalendarView({ events, onDateSelect, onEventClick, onNewEvent, getWorkload }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<ViewMode>('month')

  const navigate = (dir: 'prev' | 'next') => {
    const fn = dir === 'next'
      ? (view === 'month' ? addMonths : view === 'week' ? addWeeks : addDays)
      : (view === 'month' ? subMonths : view === 'week' ? subWeeks : subDays)
    setCurrentDate(prev => fn(prev, 1))
  }

  const getEventsForDay = (date: Date) =>
    events.filter(e => isSameDay(parseISO(e.start), date))

  // Month view
  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 })
    return eachDayOfInterval({ start, end })
  }, [currentDate])

  // Week view
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 0 })
    return eachDayOfInterval({ start, end: endOfWeek(currentDate, { weekStartsOn: 0 }) })
  }, [currentDate])

  const headerLabel = view === 'month'
    ? format(currentDate, 'MMMM yyyy', { locale: ptBR })
    : view === 'week'
      ? `${format(weekDays[0], 'dd MMM', { locale: ptBR })} - ${format(weekDays[6], 'dd MMM yyyy', { locale: ptBR })}`
      : format(currentDate, "EEEE, dd 'de' MMMM yyyy", { locale: ptBR })

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="capitalize text-lg">
            {headerLabel}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border">
              {(['month', 'week', 'day'] as ViewMode[]).map(v => (
                <Button
                  key={v}
                  variant="ghost"
                  size="sm"
                  onClick={() => setView(v)}
                  className={`rounded-none first:rounded-l-lg last:rounded-r-lg text-xs px-3 ${view === v ? 'bg-secondary' : ''}`}
                >
                  {v === 'month' ? 'Mes' : v === 'week' ? 'Semana' : 'Dia'}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setCurrentDate(new Date())}>
                Hoje
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            {onNewEvent && (
              <Button size="sm" className="h-8" onClick={onNewEvent}>
                <Plus className="h-4 w-4 mr-1" />
                Evento
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {view === 'month' && (
          <MonthView
            days={monthDays}
            currentDate={currentDate}
            getEventsForDay={getEventsForDay}
            onDateSelect={onDateSelect}
            onEventClick={onEventClick}
            getWorkload={getWorkload}
          />
        )}
        {view === 'week' && (
          <WeekView
            days={weekDays}
            events={events}
            onEventClick={onEventClick}
            onDateSelect={onDateSelect}
          />
        )}
        {view === 'day' && (
          <DayView
            date={currentDate}
            events={getEventsForDay(currentDate)}
            onEventClick={onEventClick}
          />
        )}
      </CardContent>
    </Card>
  )
}

// ---- Month View ----
function MonthView({
  days,
  currentDate,
  getEventsForDay,
  onDateSelect,
  onEventClick,
  getWorkload,
}: {
  days: Date[]
  currentDate: Date
  getEventsForDay: (d: Date) => CalendarEvent[]
  onDateSelect?: (d: Date) => void
  onEventClick?: (e: CalendarEvent) => void
  getWorkload?: (d: Date) => { level: 'light' | 'moderate' | 'heavy'; utilizationPercent: number }
}) {
  const today = new Date()
  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map(d => (
          <div key={d} className="text-center font-semibold text-xs text-muted-foreground p-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
        {days.map(day => {
          const dayEvents = getEventsForDay(day)
          const isToday = isSameDay(day, today)
          const isCurrentMonth = isSameMonth(day, currentDate)
          const workload = getWorkload?.(day)

          return (
            <div
              key={day.toISOString()}
              className={`min-h-[5.5rem] p-1.5 bg-card cursor-pointer hover:bg-accent/50 transition-colors ${
                !isCurrentMonth ? 'opacity-40' : ''
              } ${workload ? getWorkloadColor(workload.level) : ''}`}
              onClick={() => onDateSelect?.(day)}
            >
              <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                isToday ? 'bg-primary text-primary-foreground' : ''
              }`}>
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map(event => (
                  <div
                    key={event.id}
                    className="text-[10px] leading-tight px-1 py-0.5 rounded truncate cursor-pointer"
                    style={{ backgroundColor: event.color + '30', color: event.color, borderLeft: `2px solid ${event.color}` }}
                    onClick={(e) => { e.stopPropagation(); onEventClick?.(event) }}
                    title={event.title}
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-muted-foreground px-1">
                    +{dayEvents.length - 3} mais
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---- Week View ----
function WeekView({
  days,
  events,
  onEventClick,
  onDateSelect,
}: {
  days: Date[]
  events: CalendarEvent[]
  onEventClick?: (e: CalendarEvent) => void
  onDateSelect?: (d: Date) => void
}) {
  const today = new Date()

  return (
    <div className="overflow-auto">
      <div className="min-w-[600px]">
        {/* Header */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b">
          <div className="p-2" />
          {days.map(day => (
            <div
              key={day.toISOString()}
              className={`p-2 text-center border-l cursor-pointer hover:bg-accent/30 ${
                isSameDay(day, today) ? 'bg-primary/5' : ''
              }`}
              onClick={() => onDateSelect?.(day)}
            >
              <div className="text-xs text-muted-foreground">
                {format(day, 'EEE', { locale: ptBR })}
              </div>
              <div className={`text-sm font-semibold w-7 h-7 mx-auto flex items-center justify-center rounded-full ${
                isSameDay(day, today) ? 'bg-primary text-primary-foreground' : ''
              }`}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* Hour rows */}
        {HOURS.map(hour => (
          <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b min-h-[3.5rem]">
            <div className="p-1 text-[10px] text-muted-foreground text-right pr-2 pt-0">
              {`${hour.toString().padStart(2, '0')}:00`}
            </div>
            {days.map(day => {
              const dayEvents = events.filter(e => {
                const s = parseISO(e.start)
                return isSameDay(s, day) && getHours(s) === hour
              })

              return (
                <div key={day.toISOString()} className="border-l p-0.5 relative">
                  {dayEvents.map(event => {
                    const start = parseISO(event.start)
                    const end = parseISO(event.end)
                    const durationMin = (end.getTime() - start.getTime()) / (1000 * 60)
                    const heightRem = Math.max(1.5, (durationMin / 60) * 3.5)
                    const topOffset = (getMinutes(start) / 60) * 3.5

                    return (
                      <div
                        key={event.id}
                        className="absolute left-0.5 right-0.5 rounded px-1 py-0.5 text-[10px] leading-tight cursor-pointer overflow-hidden z-10"
                        style={{
                          backgroundColor: event.color + '30',
                          borderLeft: `2px solid ${event.color}`,
                          color: event.color,
                          height: `${heightRem}rem`,
                          top: `${topOffset}rem`,
                        }}
                        onClick={() => onEventClick?.(event)}
                        title={`${event.title} (${format(start, 'HH:mm')} - ${format(end, 'HH:mm')})`}
                      >
                        <div className="font-medium truncate">{event.title}</div>
                        <div className="opacity-70">{format(start, 'HH:mm')}</div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- Day View ----
function DayView({
  date,
  events,
  onEventClick,
}: {
  date: Date
  events: CalendarEvent[]
  onEventClick?: (e: CalendarEvent) => void
}) {
  return (
    <div className="space-y-0">
      {HOURS.map(hour => {
        const hourEvents = events.filter(e => getHours(parseISO(e.start)) === hour)

        return (
          <div key={hour} className="flex border-b min-h-[4rem]">
            <div className="w-16 shrink-0 text-xs text-muted-foreground text-right pr-3 pt-1">
              {`${hour.toString().padStart(2, '0')}:00`}
            </div>
            <div className="flex-1 p-1 relative">
              {hourEvents.map(event => {
                const start = parseISO(event.start)
                const end = parseISO(event.end)
                const durationMin = (end.getTime() - start.getTime()) / (1000 * 60)

                return (
                  <div
                    key={event.id}
                    className="rounded-lg px-3 py-2 mb-1 cursor-pointer hover:opacity-80 transition-opacity"
                    style={{
                      backgroundColor: event.color + '20',
                      borderLeft: `3px solid ${event.color}`,
                    }}
                    onClick={() => onEventClick?.(event)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{event.title}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {event.category}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <Clock className="h-3 w-3" />
                      <span>{format(start, 'HH:mm')} - {format(end, 'HH:mm')}</span>
                      <span>({durationMin}min)</span>
                    </div>
                    {event.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {event.description}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
