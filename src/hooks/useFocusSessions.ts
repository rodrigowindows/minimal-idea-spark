import { useState, useCallback } from 'react'
import type { FocusSession } from '@/types'

const STORAGE_KEY = 'lifeos_focus_sessions'

function getStoredSessions(): FocusSession[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function useFocusSessions() {
  const [sessions, setSessions] = useState<FocusSession[]>(getStoredSessions)

  const persist = useCallback((updated: FocusSession[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }, [])

  const addSession = useCallback((session: Omit<FocusSession, 'id'>) => {
    const newSession: FocusSession = {
      ...session,
      id: `fs-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    }
    setSessions(prev => {
      const updated = [newSession, ...prev]
      persist(updated)
      return updated
    })
    return newSession
  }, [persist])

  const getTotalMinutesToday = useCallback(() => {
    const today = new Date().toISOString().split('T')[0]
    return sessions
      .filter(s => s.started_at.startsWith(today))
      .reduce((sum, s) => sum + s.duration_minutes, 0)
  }, [sessions])

  const getTotalMinutesThisWeek = useCallback(() => {
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    weekStart.setHours(0, 0, 0, 0)

    return sessions
      .filter(s => new Date(s.started_at) >= weekStart)
      .reduce((sum, s) => sum + s.duration_minutes, 0)
  }, [sessions])

  const getRecentSessions = useCallback((count: number = 10) => {
    return sessions.slice(0, count)
  }, [sessions])

  return {
    sessions,
    addSession,
    getTotalMinutesToday,
    getTotalMinutesThisWeek,
    getRecentSessions,
  }
}
