/**
 * Notification manager: in-memory + optional persistence.
 */

export type NotificationChannel = 'in_app' | 'email' | 'push'

export interface AppNotification {
  id: string
  title: string
  body: string
  channel: NotificationChannel
  read: boolean
  createdAt: string
  priority: number
  groupKey?: string
}

const STORAGE_KEY = 'minimal_idea_spark_notifications'

export function getStoredNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function setStoredNotifications(list: AppNotification[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(-200)))
}

export function addNotification(n: Omit<AppNotification, 'id' | 'read' | 'createdAt'>): AppNotification {
  const list = getStoredNotifications()
  const item: AppNotification = {
    ...n,
    id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    read: false,
    createdAt: new Date().toISOString(),
  }
  list.unshift(item)
  setStoredNotifications(list)
  return item
}

export function markAsRead(id: string): void {
  const list = getStoredNotifications().map(n => n.id === id ? { ...n, read: true } : n)
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
