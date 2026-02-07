import { useState, useCallback, useEffect, useMemo } from 'react'
import type { CalendarEvent, Opportunity } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  addMinutes,
  parseISO,
  isWithinInterval,
  isSameDay,
  addDays,
  addWeeks,
  addMonths,
} from 'date-fns'

const STORAGE_KEY = 'lifeos_calendar_events'

const EVENT_COLORS: Record<CalendarEvent['category'], string> = {
  task: '#3b82f6',
  meeting: '#f59e0b',
  focus: '#8b5cf6',
  personal: '#22c55e',
  reminder: '#ef4444',
}

function loadEvents(): CalendarEvent[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  return []
}

function saveEvents(events: CalendarEvent[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events))
}

export function useCalendarEvents() {
  const { user } = useAuth()
  const userId = user?.id ?? 'mock-user-001'

  const [events, setEvents] = useState<CalendarEvent[]>(loadEvents)

  useEffect(() => {
    saveEvents(events)
  }, [events])

  const addEvent = useCallback((data: Omit<CalendarEvent, 'id' | 'user_id' | 'created_at'>) => {
    const newEvent: CalendarEvent = {
      ...data,
      id: `cal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
      color: data.color || EVENT_COLORS[data.category] || '#3b82f6',
      created_at: new Date().toISOString(),
    }
    setEvents(prev => [...prev, newEvent])
    return newEvent
  }, [userId])

  const updateEvent = useCallback((id: string, updates: Partial<CalendarEvent>) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e))
  }, [])

  const deleteEvent = useCallback((id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id))
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

  // Workload analysis for a given date
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
