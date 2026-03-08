import { useState, useCallback, useEffect, useRef } from 'react'
import type { CalendarEvent, Opportunity } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMinutes,
  parseISO,
  isWithinInterval,
  isSameDay,
} from 'date-fns'

const STORAGE_KEY = 'lifeos_calendar_events'

const EVENT_COLORS: Record<CalendarEvent['category'], string> = {
  task: '#3b82f6',
  meeting: '#f59e0b',
  focus: '#8b5cf6',
  personal: '#22c55e',
  reminder: '#ef4444',
}

export function useCalendarEvents() {
  const { user } = useAuth()
  const userId = user?.id
  const loadedForUser = useRef<string | null>(null)

  const [events, setEvents] = useState<CalendarEvent[]>([])

  // Load from Supabase + migrate localStorage
  useEffect(() => {
    if (!userId) {
      setEvents([])
      loadedForUser.current = null
      return
    }
    if (loadedForUser.current === userId) return
    loadedForUser.current = userId

    async function load() {
      try {
        const { data, error } = await supabase
          .from('calendar_events')
          .select('*')
          .order('start', { ascending: true })

        if (!error && data && data.length > 0) {
          setEvents(data as unknown as CalendarEvent[])
          // Clear legacy localStorage
          try { localStorage.removeItem(STORAGE_KEY) } catch {}
        } else if (!error && (!data || data.length === 0)) {
          // Migrate from localStorage if exists
          try {
            const stored = localStorage.getItem(STORAGE_KEY)
            if (stored) {
              const localEvents: CalendarEvent[] = JSON.parse(stored)
              if (localEvents.length > 0) {
                setEvents(localEvents)
                const rows = localEvents.map(e => ({
                  id: undefined as any, // let DB generate
                  user_id: userId!,
                  title: e.title,
                  description: e.description ?? null,
                  start: e.start,
                  end: e.end,
                  color: e.color || '#3b82f6',
                  category: e.category || 'task',
                  opportunity_id: e.opportunity_id ?? null,
                  reminder_minutes: e.reminder_minutes ?? null,
                  recurrence: e.recurrence ?? null,
                }))
                // Remove undefined id so DB auto-generates
                const cleanRows = rows.map(({ id, ...rest }) => rest)
                const { data: inserted } = await supabase.from('calendar_events').insert(cleanRows).select()
                if (inserted) setEvents(inserted as unknown as CalendarEvent[])
                localStorage.removeItem(STORAGE_KEY)
              }
            }
          } catch { /* ignore migration errors */ }
        }
      } catch { /* ignore */ }
    }
    load()
  }, [userId])

  const addEvent = useCallback((data: Omit<CalendarEvent, 'id' | 'user_id' | 'created_at'>) => {
    if (!userId) return null as unknown as CalendarEvent
    const tempId = crypto.randomUUID()
    const newEvent: CalendarEvent = {
      ...data,
      id: tempId,
      user_id: userId,
      color: data.color || EVENT_COLORS[data.category] || '#3b82f6',
      created_at: new Date().toISOString(),
    }
    setEvents(prev => [...prev, newEvent])

    supabase.from('calendar_events').insert({
      user_id: userId,
      title: data.title,
      description: data.description ?? null,
      start: data.start,
      end: data.end,
      color: newEvent.color,
      category: data.category || 'task',
      opportunity_id: data.opportunity_id ?? null,
      reminder_minutes: data.reminder_minutes ?? null,
      recurrence: data.recurrence ?? null,
    }).select().single().then(({ data: row, error }) => {
      if (error) {
        console.error('[addCalendarEvent]', error)
      } else if (row) {
        // Replace temp event with server version (real id)
        setEvents(prev => prev.map(e => e.id === tempId ? (row as unknown as CalendarEvent) : e))
      }
    })

    return newEvent
  }, [userId])

  const updateEvent = useCallback((id: string, updates: Partial<CalendarEvent>) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e))
    const { id: _id, user_id: _uid, created_at: _ca, ...safeUpdates } = updates as any
    supabase.from('calendar_events').update(safeUpdates).eq('id', id).then(({ error }) => {
      if (error) console.error('[updateCalendarEvent]', error)
    })
  }, [])

  const deleteEvent = useCallback((id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id))
    supabase.from('calendar_events').delete().eq('id', id).then(({ error }) => {
      if (error) console.error('[deleteCalendarEvent]', error)
    })
  }, [])

  const getEventsForDate = useCallback((date: Date) => {
    return events.filter(e => {
      const eventStart = parseISO(e.start)
      return isSameDay(eventStart, date)
    })
  }, [events])

  const getEventsForRange = useCallback((start: Date, end: Date) => {
    return events.filter(e => {
      const eventStart = parseISO(e.start)
      return isWithinInterval(eventStart, { start, end })
    })
  }, [events])

  const getEventsForMonth = useCallback((date: Date) => {
    const start = startOfWeek(startOfMonth(date), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(date), { weekStartsOn: 0 })
    return getEventsForRange(start, end)
  }, [getEventsForRange])

  const getEventsForWeek = useCallback((date: Date) => {
    const start = startOfWeek(date, { weekStartsOn: 0 })
    const end = endOfWeek(date, { weekStartsOn: 0 })
    return getEventsForRange(start, end)
  }, [getEventsForRange])

  const createEventFromOpportunity = useCallback((opportunity: Opportunity, startTime: Date, durationMinutes: number = 60) => {
    return addEvent({
      title: opportunity.title,
      description: opportunity.description,
      start: startTime.toISOString(),
      end: addMinutes(startTime, durationMinutes).toISOString(),
      color: opportunity.domain?.color_theme || '#3b82f6',
      category: 'task',
      opportunity_id: opportunity.id,
      reminder_minutes: 15,
      recurrence: null,
    })
  }, [addEvent])

  const getWorkload = useCallback((date: Date) => {
    const dayEvents = getEventsForDate(date)
    const totalMinutes = dayEvents.reduce((sum, e) => {
      const start = parseISO(e.start)
      const end = parseISO(e.end)
      return sum + (end.getTime() - start.getTime()) / (1000 * 60)
    }, 0)
    const workingHours = 8 * 60
    return {
      totalEvents: dayEvents.length,
      totalMinutes,
      utilizationPercent: Math.min(Math.round((totalMinutes / workingHours) * 100), 100),
      level: totalMinutes > 360 ? 'heavy' as const : totalMinutes > 180 ? 'moderate' as const : 'light' as const,
    }
  }, [getEventsForDate])

  return {
    events,
    addEvent,
    updateEvent,
    deleteEvent,
    getEventsForDate,
    getEventsForRange,
    getEventsForMonth,
    getEventsForWeek,
    createEventFromOpportunity,
    getWorkload,
    EVENT_COLORS,
  }
}
