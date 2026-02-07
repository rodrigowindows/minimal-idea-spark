import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  CalendarDays,
  Sparkles,
  Clock,
  TrendingUp,
  Zap,
  BarChart3,
} from 'lucide-react'
import { CalendarView } from '@/components/Calendar/CalendarView'
import { EventModal } from '@/components/Calendar/EventModal'
import { useCalendarEvents } from '@/hooks/useCalendarEvents'
import { useLocalData } from '@/hooks/useLocalData'
import { useTimeBlocking } from '@/hooks/useTimeBlocking'
import { autoScheduleDay, analyzeProductivity } from '@/lib/ai-scheduling'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale/pt-BR'
import { toast } from 'sonner'
import type { CalendarEvent } from '@/types'

export function CalendarPage() {
  const {
    events,
    addEvent,
    updateEvent,
    deleteEvent,
    getWorkload,
  } = useCalendarEvents()
  const { opportunities } = useLocalData()
  const { blocks } = useTimeBlocking()

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null)

  // Productivity stats
  const stats = useMemo(() => analyzeProductivity(events), [events])
  const todayWorkload = useMemo(() => getWorkload(new Date()), [events])

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
    setEditEvent(null)
    setModalOpen(true)
  }

  const handleEventClick = (event: CalendarEvent) => {
    setEditEvent(event)
    setSelectedDate(null)
    setModalOpen(true)
  }

  const handleSave = (data: Omit<CalendarEvent, 'id' | 'user_id' | 'created_at'>) => {
    if (editEvent) {
      updateEvent(editEvent.id, data)
      toast.success('Evento atualizado')
    } else {
      addEvent(data)
      toast.success('Evento criado')
    }
  }

  const handleDelete = (id: string) => {
    deleteEvent(id)
    toast.success('Evento excluido')
  }

  const handleAutoSchedule = () => {
    const doingOpps = opportunities.filter(o => o.status === 'doing')
    if (doingOpps.length === 0) {
      toast.info('Nenhuma oportunidade em andamento para agendar')
      return
    }

    const date = selectedDate || new Date()
    const suggestions = autoScheduleDay(doingOpps, date, events, blocks)

    if (suggestions.length === 0) {
      toast.info('Sem horarios disponiveis para hoje')
      return
    }

    for (const s of suggestions) {
      addEvent({
        title: s.opportunity.title,
        description: s.opportunity.description,
        start: s.suggestedSlot.start.toISOString(),
        end: s.suggestedSlot.end.toISOString(),
        color: s.opportunity.domain?.color_theme || '#3b82f6',
        category: 'task',
        opportunity_id: s.opportunity.id,
        reminder_minutes: 15,
        recurrence: null,
      })
    }

    toast.success(`${suggestions.length} eventos agendados automaticamente`)
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-7 w-7 text-primary" />
            Calendario Inteligente
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie seu tempo com sugestoes inteligentes de agendamento
          </p>
        </div>
        <Button onClick={handleAutoSchedule} variant="outline" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Auto-Agendar Dia
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/10 p-2">
                <CalendarDays className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Eventos</p>
                <p className="text-xl font-bold">{stats.totalEvents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-500/10 p-2">
                <Clock className="h-4 w-4 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Horas Agendadas</p>
                <p className="text-xl font-bold">{stats.totalHours}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-500/10 p-2">
                <TrendingUp className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pico Produtividade</p>
                <p className="text-xl font-bold">{stats.peakHour}:00</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-500/10 p-2">
                <Zap className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Carga Hoje</p>
                <p className="text-xl font-bold">{todayWorkload.utilizationPercent}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workload bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Carga de Trabalho Hoje</span>
            </div>
            <Badge
              variant={todayWorkload.level === 'heavy' ? 'destructive' : 'secondary'}
            >
              {todayWorkload.level === 'heavy' ? 'Pesada' : todayWorkload.level === 'moderate' ? 'Moderada' : 'Leve'}
            </Badge>
          </div>
          <Progress value={todayWorkload.utilizationPercent} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{todayWorkload.totalEvents} eventos</span>
            <span>{Math.round(todayWorkload.totalMinutes / 60 * 10) / 10}h de 8h</span>
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      <CalendarView
        events={events}
        onDateSelect={handleDateSelect}
        onEventClick={handleEventClick}
        onNewEvent={() => {
          setEditEvent(null)
          setSelectedDate(null)
          setModalOpen(true)
        }}
        getWorkload={getWorkload}
      />

      {/* Upcoming Events */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Proximos Eventos</CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            const now = new Date()
            const upcoming = events
              .filter(e => parseISO(e.start) >= now)
              .sort((a, b) => parseISO(a.start).getTime() - parseISO(b.start).getTime())
              .slice(0, 5)

            if (upcoming.length === 0) {
              return (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum evento futuro agendado
                </p>
              )
            }

            return (
              <div className="space-y-2">
                {upcoming.map(event => (
                  <div
                    key={event.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => handleEventClick(event)}
                  >
                    <div
                      className="w-1 h-10 rounded-full shrink-0"
                      style={{ backgroundColor: event.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(event.start), "EEE, dd MMM 'as' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {event.category}
                    </Badge>
                  </div>
                ))}
              </div>
            )
          })()}
        </CardContent>
      </Card>

      {/* Event Modal */}
      <EventModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSave={handleSave}
        onDelete={handleDelete}
        initialDate={selectedDate || undefined}
        editEvent={editEvent}
        opportunities={opportunities}
      />
    </div>
  )
}
