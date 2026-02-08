/**
 * AI-style priority engine for notifications.
 * Scores each notification based on type, recency, keywords, user context, and urgency signals.
 */

import type { AppNotification, NotificationType } from './manager'

// ── Type weights: how important each notification type is by default ──

const TYPE_WEIGHTS: Record<NotificationType, number> = {
  task_due: 25,
  calendar_event: 22,
  habit_reminder: 15,
  goal_progress: 12,
  achievement: 20,
  streak: 18,
  weekly_review: 10,
  deep_work: 8,
  xp_milestone: 16,
  system: 5,
  insight: 10,
  general: 3,
}

// ── Keyword urgency patterns ──

const URGENCY_KEYWORDS: { pattern: RegExp; boost: number }[] = [
  { pattern: /\burgent\b/i, boost: 30 },
  { pattern: /\boverdue\b/i, boost: 25 },
  { pattern: /\bmissed\b/i, boost: 20 },
  { pattern: /\bdeadline\b/i, boost: 20 },
  { pattern: /\bexpiring\b/i, boost: 18 },
  { pattern: /\breminder\b/i, boost: 12 },
  { pattern: /\bcongratulations?\b/i, boost: 10 },
  { pattern: /\bcompleted?\b/i, boost: 8 },
  { pattern: /\bnew\b/i, boost: 5 },
  { pattern: /\bstreak\b/i, boost: 15 },
  { pattern: /\blevel\s*up\b/i, boost: 18 },
  { pattern: /\bachievement\b/i, boost: 14 },
]

// ── Recency decay: notifications lose relevance over time ──

function recencyScore(createdAt: string): number {
  const ageMs = Date.now() - new Date(createdAt).getTime()
  const ageHours = ageMs / (1000 * 60 * 60)
  if (ageHours < 1) return 20
  if (ageHours < 6) return 15
  if (ageHours < 24) return 10
  if (ageHours < 72) return 5
  if (ageHours < 168) return 2
  return 0
}

// ── Time-of-day context boost ──

function contextualTimeBoost(n: AppNotification): number {
  const hour = new Date().getHours()
  const isMorning = hour >= 6 && hour < 12
  const isAfternoon = hour >= 12 && hour < 18
  const isEvening = hour >= 18 && hour < 22

  if (n.type === 'habit_reminder' && isMorning) return 10
  if (n.type === 'deep_work' && isAfternoon) return 8
  if (n.type === 'weekly_review' && isEvening) return 6
  if (n.type === 'calendar_event') return 5
  return 0
}

// ── Main scoring function ──

export function scorePriority(n: AppNotification): number {
  let score = n.priority ?? 0

  // Type-based weight
  score += TYPE_WEIGHTS[n.type] ?? TYPE_WEIGHTS.general

  // Keyword analysis on title + body
  const text = `${n.title} ${n.body}`
  for (const { pattern, boost } of URGENCY_KEYWORDS) {
    if (pattern.test(text)) score += boost
  }

  // Recency
  score += recencyScore(n.createdAt)

  // Unread bonus
  if (!n.read) score += 10

  // Contextual time-of-day boost
  score += contextualTimeBoost(n)

  return score
}

// ── Sort by computed priority ──

export function sortByPriority(list: AppNotification[]): AppNotification[] {
  return [...list].sort((a, b) => scorePriority(b) - scorePriority(a))
}

// ── Intelligent grouping ──

export interface NotificationGroup {
  key: string
  label: string
  notifications: AppNotification[]
  topPriority: number
}

export function groupByKey(list: AppNotification[]): Map<string, AppNotification[]> {
  const map = new Map<string, AppNotification[]>()
  for (const n of list) {
    const key = n.groupKey ?? n.type
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(n)
  }
  return map
}

export function getSmartGroups(list: AppNotification[]): NotificationGroup[] {
  const grouped = groupByKey(list)
  const groups: NotificationGroup[] = []

  for (const [key, items] of grouped) {
    const sorted = sortByPriority(items)
    groups.push({
      key,
      label: formatGroupLabel(key),
      notifications: sorted,
      topPriority: sorted.length > 0 ? scorePriority(sorted[0]) : 0,
    })
  }

  return groups.sort((a, b) => b.topPriority - a.topPriority)
}

function formatGroupLabel(key: string): string {
  const labels: Record<string, string> = {
    task_due: 'Tasks Due',
    goal_progress: 'Goal Progress',
    habit_reminder: 'Habit Reminders',
    achievement: 'Achievements',
    streak: 'Streaks',
    weekly_review: 'Weekly Review',
    calendar_event: 'Calendar Events',
    deep_work: 'Deep Work',
    xp_milestone: 'XP Milestones',
    system: 'System',
    insight: 'Insights',
    general: 'General',
  }
  return labels[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ── Priority level label ──

export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low'

export function getPriorityLevel(n: AppNotification): PriorityLevel {
  const score = scorePriority(n)
  if (score >= 60) return 'critical'
  if (score >= 40) return 'high'
  if (score >= 20) return 'medium'
  return 'low'
}
