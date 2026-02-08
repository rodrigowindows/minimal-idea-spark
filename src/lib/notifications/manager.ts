/**
 * Notification manager: localStorage-based with snooze, archive, digest, preferences.
 */

export type NotificationChannel = 'in_app' | 'email' | 'push'

export type NotificationType =
  | 'task_due'
  | 'goal_progress'
  | 'habit_reminder'
  | 'achievement'
  | 'streak'
  | 'weekly_review'
  | 'calendar_event'
  | 'deep_work'
  | 'xp_milestone'
  | 'system'
  | 'insight'
  | 'general'

export interface AppNotification {
  id: string
  title: string
  body: string
  channel: NotificationChannel
  read: boolean
  createdAt: string
  priority: number
  groupKey?: string
  type: NotificationType
  archived: boolean
  snoozedUntil?: string | null
  actionUrl?: string
  icon?: string
  metadata?: Record<string, unknown>
}

export interface NotificationPreferences {
  enabled: boolean
  channels: Record<NotificationChannel, boolean>
  types: Record<NotificationType, boolean>
  quietHoursStart: string | null // HH:mm
  quietHoursEnd: string | null   // HH:mm
  digestFrequency: 'none' | 'daily' | 'weekly'
  digestTime: string // HH:mm
  groupSimilar: boolean
  maxVisible: number
}

const STORAGE_KEY = 'minimal_idea_spark_notifications'
const PREFS_KEY = 'minimal_idea_spark_notification_prefs'
const MAX_STORED = 500

const DEFAULT_PREFS: NotificationPreferences = {
  enabled: true,
  channels: { in_app: true, email: false, push: true },
  types: {
    task_due: true,
    goal_progress: true,
    habit_reminder: true,
    achievement: true,
    streak: true,
    weekly_review: true,
    calendar_event: true,
    deep_work: true,
    xp_milestone: true,
    system: true,
    insight: true,
    general: true,
  },
  quietHoursStart: null,
  quietHoursEnd: null,
  digestFrequency: 'none',
  digestTime: '09:00',
  groupSimilar: true,
  maxVisible: 50,
}

// ── Storage helpers ──────────────────────────────────────────

export function getStoredNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as AppNotification[]
    // Migration: ensure new fields exist
    return parsed.map(n => ({
      ...n,
      type: n.type ?? 'general',
      archived: n.archived ?? false,
      snoozedUntil: n.snoozedUntil ?? null,
    }))
  } catch {
    return []
  }
}

export function setStoredNotifications(list: AppNotification[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(-MAX_STORED)))
}

// ── Preferences ──────────────────────────────────────────────

export function getPreferences(): NotificationPreferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return { ...DEFAULT_PREFS }
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

export function setPreferences(prefs: Partial<NotificationPreferences>): NotificationPreferences {
  const current = getPreferences()
  const updated = { ...current, ...prefs }
  localStorage.setItem(PREFS_KEY, JSON.stringify(updated))
  return updated
}

// ── Quiet hours check ────────────────────────────────────────

export function isInQuietHours(): boolean {
  const prefs = getPreferences()
  if (!prefs.quietHoursStart || !prefs.quietHoursEnd) return false
  if (typeof prefs.quietHoursStart !== 'string' || typeof prefs.quietHoursEnd !== 'string') return false
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const startParts = prefs.quietHoursStart.split(':').map(Number)
  const endParts = prefs.quietHoursEnd.split(':').map(Number)
  const [startH = 0, startM = 0] = startParts
  const [endH = 0, endM = 0] = endParts
  const start = startH * 60 + startM
  const end = endH * 60 + endM
  if (start <= end) {
    return currentMinutes >= start && currentMinutes <= end
  }
  // Overnight quiet hours (e.g. 22:00 - 07:00)
  return currentMinutes >= start || currentMinutes <= end
}

// ── CRUD operations ──────────────────────────────────────────

export function addNotification(
  n: Omit<AppNotification, 'id' | 'read' | 'createdAt' | 'archived'>
): AppNotification | null {
  const prefs = getPreferences()
  if (!prefs.enabled) return null
  if (!prefs.types[n.type ?? 'general']) return null
  if (!prefs.channels[n.channel]) return null

  const list = getStoredNotifications()
  const item: AppNotification = {
    ...n,
    id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    read: false,
    createdAt: new Date().toISOString(),
    archived: false,
    type: n.type ?? 'general',
  }
  list.unshift(item)
  setStoredNotifications(list)
  return item
}

export function markAsRead(id: string): void {
  const list = getStoredNotifications().map(n =>
    n.id === id ? { ...n, read: true } : n
  )
  setStoredNotifications(list)
}

export function markAllAsRead(): void {
  const list = getStoredNotifications().map(n => ({ ...n, read: true }))
  setStoredNotifications(list)
}

export function removeNotification(id: string): void {
  const list = getStoredNotifications().filter(n => n.id !== id)
  setStoredNotifications(list)
}

export function archiveNotification(id: string): void {
  const list = getStoredNotifications().map(n =>
    n.id === id ? { ...n, archived: true, read: true } : n
  )
  setStoredNotifications(list)
}

export function archiveAllRead(): void {
  const list = getStoredNotifications().map(n =>
    n.read ? { ...n, archived: true } : n
  )
  setStoredNotifications(list)
}

export function snoozeNotification(id: string, until: Date): void {
  const list = getStoredNotifications().map(n =>
    n.id === id ? { ...n, snoozedUntil: until.toISOString(), read: true } : n
  )
  setStoredNotifications(list)
}

export function unsnoozeExpired(): AppNotification[] {
  const now = new Date().toISOString()
  const list = getStoredNotifications()
  const unsnoozed: AppNotification[] = []
  const updated = list.map(n => {
    if (n.snoozedUntil && n.snoozedUntil <= now) {
      unsnoozed.push({ ...n, snoozedUntil: null, read: false })
      return { ...n, snoozedUntil: null, read: false }
    }
    return n
  })
  if (unsnoozed.length > 0) {
    setStoredNotifications(updated)
  }
  return unsnoozed
}

// ── Filtering helpers ────────────────────────────────────────

export function getActiveNotifications(): AppNotification[] {
  const now = new Date().toISOString()
  return getStoredNotifications().filter(n => {
    if (n.archived) return false
    if (n.snoozedUntil && n.snoozedUntil > now) return false
    return true
  })
}

export function getArchivedNotifications(): AppNotification[] {
  return getStoredNotifications().filter(n => n.archived)
}

export function getSnoozedNotifications(): AppNotification[] {
  const now = new Date().toISOString()
  return getStoredNotifications().filter(
    n => n.snoozedUntil && n.snoozedUntil > now && !n.archived
  )
}

// ── Digest ───────────────────────────────────────────────────

export function getDigestNotifications(): AppNotification[] {
  const prefs = getPreferences()
  if (prefs.digestFrequency === 'none') return []

  const now = new Date()
  const cutoff = new Date(now)
  if (prefs.digestFrequency === 'daily') {
    cutoff.setDate(cutoff.getDate() - 1)
  } else {
    cutoff.setDate(cutoff.getDate() - 7)
  }

  return getStoredNotifications().filter(
    n => new Date(n.createdAt) >= cutoff && !n.archived
  )
}

export function clearAll(): void {
  localStorage.removeItem(STORAGE_KEY)
}
