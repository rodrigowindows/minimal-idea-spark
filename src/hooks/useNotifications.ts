import { useState, useEffect, useCallback } from 'react'
import {
  getActiveNotifications,
  getArchivedNotifications,
  getSnoozedNotifications,
  markAsRead,
  markAllAsRead,
  removeNotification,
  addNotification,
  archiveNotification,
  archiveAllRead,
  snoozeNotification,
  unsnoozeExpired,
  getPreferences,
  setPreferences,
  type AppNotification,
  type NotificationChannel,
  type NotificationType,
  type NotificationPreferences,
} from '@/lib/notifications/manager'
import { sortByPriority, getSmartGroups, type NotificationGroup } from '@/lib/notifications/priority-engine'

export function useNotifications() {
  const [active, setActive] = useState<AppNotification[]>([])
  const [archived, setArchived] = useState<AppNotification[]>([])
  const [snoozed, setSnoozed] = useState<AppNotification[]>([])
  const [prefs, setPrefs] = useState<NotificationPreferences>(() => getPreferences())

  const refresh = useCallback(() => {
    // Unsnooze any expired snoozed notifications
    unsnoozeExpired()
    setActive(sortByPriority(getActiveNotifications()))
    setArchived(getArchivedNotifications())
    setSnoozed(getSnoozedNotifications())
    setPrefs(getPreferences())
  }, [])

  useEffect(() => {
    refresh()
    // Poll for snoozed notification expiry every 30s
    const interval = setInterval(() => {
      const unsnoozed = unsnoozeExpired()
      if (unsnoozed.length > 0) refresh()
    }, 30_000)
    return () => clearInterval(interval)
  }, [refresh])

  const markRead = useCallback((id: string) => {
    markAsRead(id)
    refresh()
  }, [refresh])

  const markAllRead = useCallback(() => {
    markAllAsRead()
    refresh()
  }, [refresh])

  const remove = useCallback((id: string) => {
    removeNotification(id)
    refresh()
  }, [refresh])

  const archive = useCallback((id: string) => {
    archiveNotification(id)
    refresh()
  }, [refresh])

  const archiveRead = useCallback(() => {
    archiveAllRead()
    refresh()
  }, [refresh])

  const snooze = useCallback((id: string, minutes: number) => {
    const until = new Date(Date.now() + minutes * 60 * 1000)
    snoozeNotification(id, until)
    refresh()
  }, [refresh])

  const notify = useCallback((
    title: string,
    body: string,
    options?: {
      priority?: number
      channel?: NotificationChannel
      type?: NotificationType
      groupKey?: string
      actionUrl?: string
      icon?: string
      metadata?: Record<string, unknown>
    }
  ) => {
    const result = addNotification({
      title,
      body,
      channel: options?.channel ?? 'in_app',
      priority: options?.priority ?? 0,
      type: options?.type ?? 'general',
      groupKey: options?.groupKey,
      snoozedUntil: null,
      actionUrl: options?.actionUrl,
      icon: options?.icon,
      metadata: options?.metadata,
    })
    refresh()
    return result
  }, [refresh])

  const updatePreferences = useCallback((updates: Partial<NotificationPreferences>) => {
    const updated = setPreferences(updates)
    setPrefs(updated)
  }, [])

  const groups: NotificationGroup[] = getSmartGroups(active)
  const unreadCount = active.filter(n => !n.read).length

  return {
    // Data
    active,
    archived,
    snoozed,
    groups,
    unreadCount,
    preferences: prefs,
    // Legacy compat
    list: active,
    // Actions
    markRead,
    markAllRead,
    remove,
    archive,
    archiveRead,
    snooze,
    notify,
    refresh,
    updatePreferences,
  }
}
