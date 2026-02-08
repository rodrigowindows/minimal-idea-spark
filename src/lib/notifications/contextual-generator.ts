/**
 * Contextual notification generator.
 * Generates smart notifications based on app events and user activity patterns.
 */

import { addNotification, isInQuietHours, getStoredNotifications, type NotificationType } from './manager'

// Prevent duplicate notifications within a time window
const DEDUP_WINDOW_MS = 5 * 60 * 1000 // 5 minutes

function isDuplicate(type: NotificationType, groupKey?: string): boolean {
  const recent = getStoredNotifications()
  const cutoff = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString()
  return recent.some(
    n => n.type === type && n.groupKey === groupKey && n.createdAt > cutoff
  )
}

export function notifyTaskDue(taskTitle: string, dueDate: string, actionUrl?: string) {
  if (isInQuietHours()) return
  const key = `task_due:${taskTitle}`
  if (isDuplicate('task_due', key)) return
  addNotification({
    title: 'Task Due Soon',
    body: `"${taskTitle}" is due ${dueDate}`,
    channel: 'in_app',
    priority: 20,
    type: 'task_due',
    groupKey: key,
    snoozedUntil: null,
    actionUrl,
    icon: 'target',
  })
}

export function notifyGoalProgress(goalTitle: string, progress: number) {
  if (isInQuietHours()) return
  const milestone = Math.floor(progress / 25) * 25
  if (milestone < 25) return
  const key = `goal_progress:${goalTitle}:${milestone}`
  if (isDuplicate('goal_progress', key)) return
  addNotification({
    title: 'Goal Progress',
    body: `"${goalTitle}" reached ${milestone}% — keep going!`,
    channel: 'in_app',
    priority: 10,
    type: 'goal_progress',
    groupKey: key,
    snoozedUntil: null,
    icon: 'flag',
  })
}

export function notifyHabitReminder(habitName: string) {
  if (isInQuietHours()) return
  const key = `habit:${habitName}`
  if (isDuplicate('habit_reminder', key)) return
  addNotification({
    title: 'Habit Reminder',
    body: `Time to work on "${habitName}"`,
    channel: 'in_app',
    priority: 12,
    type: 'habit_reminder',
    groupKey: key,
    snoozedUntil: null,
    icon: 'repeat',
  })
}

export function notifyAchievementUnlocked(achievementName: string, description: string) {
  if (isInQuietHours()) return
  const key = `achievement:${achievementName}`
  if (isDuplicate('achievement', key)) return
  addNotification({
    title: 'Achievement Unlocked!',
    body: `${achievementName} — ${description}`,
    channel: 'in_app',
    priority: 18,
    type: 'achievement',
    groupKey: key,
    snoozedUntil: null,
    icon: 'trophy',
  })
}

export function notifyStreak(days: number) {
  if (isInQuietHours()) return
  const key = `streak:${days}`
  if (isDuplicate('streak', key)) return
  addNotification({
    title: 'Streak Milestone!',
    body: `You're on a ${days}-day streak. Don't break it!`,
    channel: 'in_app',
    priority: 15,
    type: 'streak',
    groupKey: key,
    snoozedUntil: null,
    icon: 'flame',
  })
}

export function notifyCalendarEvent(eventTitle: string, startsIn: string) {
  if (isInQuietHours()) return
  const key = `calendar:${eventTitle}`
  if (isDuplicate('calendar_event', key)) return
  addNotification({
    title: 'Upcoming Event',
    body: `"${eventTitle}" starts ${startsIn}`,
    channel: 'in_app',
    priority: 20,
    type: 'calendar_event',
    groupKey: key,
    snoozedUntil: null,
    icon: 'calendar',
  })
}

export function notifyXPMilestone(level: number, totalXP: number) {
  if (isInQuietHours()) return
  const key = `xp:level:${level}`
  if (isDuplicate('xp_milestone', key)) return
  addNotification({
    title: 'Level Up!',
    body: `Congratulations! You reached Level ${level} (${totalXP} XP)`,
    channel: 'in_app',
    priority: 18,
    type: 'xp_milestone',
    groupKey: key,
    snoozedUntil: null,
    icon: 'zap',
  })
}

export function notifyWeeklyReviewAvailable() {
  if (isInQuietHours()) return
  const key = `weekly_review:${new Date().toISOString().slice(0, 10)}`
  if (isDuplicate('weekly_review', key)) return
  addNotification({
    title: 'Weekly Review',
    body: 'Your weekly review is ready. Reflect on your progress!',
    channel: 'in_app',
    priority: 10,
    type: 'weekly_review',
    groupKey: key,
    snoozedUntil: null,
    actionUrl: '/weekly-review',
    icon: 'clipboard-check',
  })
}

export function notifyDeepWorkCompleted(minutes: number) {
  const key = `deep_work:${Date.now()}`
  addNotification({
    title: 'Deep Work Completed',
    body: `Great focus session! ${minutes} minutes of deep work logged.`,
    channel: 'in_app',
    priority: 8,
    type: 'deep_work',
    groupKey: key,
    snoozedUntil: null,
    icon: 'brain',
  })
}

export function notifyInsight(insight: string, category?: string) {
  if (isInQuietHours()) return
  addNotification({
    title: 'AI Insight',
    body: insight,
    channel: 'in_app',
    priority: 10,
    type: 'insight',
    groupKey: category ? `insight:${category}` : undefined,
    snoozedUntil: null,
    icon: 'lightbulb',
  })
}

export function notifySystem(title: string, body: string) {
  addNotification({
    title,
    body,
    channel: 'in_app',
    priority: 5,
    type: 'system',
    snoozedUntil: null,
    icon: 'settings',
  })
}

/**
 * Generate contextual notifications based on current time and app state.
 * Call this periodically (e.g., every 5 minutes) to produce proactive alerts.
 */
export function generateContextualNotifications(context: {
  pendingTasks?: number
  streakDays?: number
  upcomingEvents?: { title: string; startTime: string }[]
  habitsToday?: { name: string; completed: boolean }[]
}) {
  if (isInQuietHours()) return

  const hour = new Date().getHours()

  // Morning habit reminders
  if (hour >= 7 && hour < 10 && context.habitsToday) {
    const pending = context.habitsToday.filter(h => !h.completed)
    if (pending.length > 0) {
      notifyHabitReminder(pending[0].name)
    }
  }

  // Upcoming calendar events (within 30 min)
  if (context.upcomingEvents) {
    const now = Date.now()
    for (const event of context.upcomingEvents) {
      const diff = new Date(event.startTime).getTime() - now
      if (diff > 0 && diff < 30 * 60 * 1000) {
        const mins = Math.round(diff / 60000)
        notifyCalendarEvent(event.title, `in ${mins} minutes`)
      }
    }
  }

  // Evening weekly review suggestion (Friday 18:00-20:00)
  const day = new Date().getDay()
  if (day === 5 && hour >= 18 && hour < 20) {
    notifyWeeklyReviewAvailable()
  }

  // Streak alert
  if (context.streakDays && context.streakDays > 0 && context.streakDays % 7 === 0) {
    notifyStreak(context.streakDays)
  }
}
