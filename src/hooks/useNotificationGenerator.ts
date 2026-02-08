import { useEffect, useRef } from 'react'
import { onXPEvent } from '@/hooks/useXPSystem'
import { useNotifications } from '@/hooks/useNotifications'
import {
  notifyXPMilestone,
  notifyAchievementUnlocked,
  notifyDeepWorkCompleted,
  generateContextualNotifications,
} from '@/lib/notifications/contextual-generator'

/**
 * Hook that bridges app events into the notification system.
 * Mount this once in the app root (e.g., in AppContent).
 */
export function useNotificationGenerator() {
  const { refresh } = useNotifications()
  const lastLevelRef = useRef<number>(0)

  // Listen for XP events and generate notifications
  useEffect(() => {
    const unsub = onXPEvent((event) => {
      if (event.type === 'level_up' && event.level) {
        if (event.level !== lastLevelRef.current) {
          lastLevelRef.current = event.level
          notifyXPMilestone(event.level, 0)
          refresh()
        }
      }
      if (event.type === 'achievement' && event.achievement) {
        notifyAchievementUnlocked(
          event.achievement.name,
          event.achievement.description || 'New achievement unlocked!'
        )
        refresh()
      }
    })
    return unsub
  }, [refresh])

  // Periodic contextual notification generation (every 5 minutes)
  useEffect(() => {
    function runContextual() {
      try {
        const habitsRaw = localStorage.getItem('lifeos_habits')
        const habits = habitsRaw ? JSON.parse(habitsRaw) : []
        const eventsRaw = localStorage.getItem('lifeos_calendar_events')
        const events = eventsRaw ? JSON.parse(eventsRaw) : []

        const habitsToday = habits.map((h: any) => ({
          name: h.name || h.title || 'Habit',
          completed: h.completed_today ?? false,
        }))

        const upcomingEvents = events
          .filter((e: any) => {
            const start = new Date(e.start_time || e.startTime || e.start).getTime()
            return start > Date.now() && start < Date.now() + 60 * 60 * 1000
          })
          .map((e: any) => ({
            title: e.title || e.name || 'Event',
            startTime: e.start_time || e.startTime || e.start,
          }))

        const xpRaw = localStorage.getItem('minimal_idea_spark_xp_state')
        const xpState = xpRaw ? JSON.parse(xpRaw) : {}

        generateContextualNotifications({
          streakDays: xpState.streakDays || 0,
          habitsToday,
          upcomingEvents,
        })

        refresh()
      } catch {
        // Silently fail - contextual notifications are non-critical
      }
    }

    // Run once on mount, then every 5 minutes
    const timer = setTimeout(runContextual, 5000) // delay initial run
    const interval = setInterval(runContextual, 5 * 60 * 1000)

    return () => {
      clearTimeout(timer)
      clearInterval(interval)
    }
  }, [refresh])
}
