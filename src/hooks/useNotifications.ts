import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  fetchActiveNotifications,
  fetchArchivedNotifications,
  fetchSnoozedNotifications,
  addNotificationToDb,
  markAsReadDb,
  markAllAsReadDb,
  archiveNotificationDb,
  archiveAllReadDb,
  removeNotificationDb,
  snoozeNotificationDb,
  unsnoozeExpiredDb,
  getPreferences,
  setPreferencesLocal,
} from '@/lib/notifications/supabase-store'
import type {
  AppNotification,
  NotificationChannel,
  NotificationType,
  NotificationPreferences,
} from '@/lib/notifications/manager'
import { sortByPriority, getSmartGroups, type NotificationGroup } from '@/lib/notifications/priority-engine'

export function useNotifications() {
  const { user } = useAuth()
  const userId = user?.id

  const [active, setActive] = useState<AppNotification[]>([])
  const [archived, setArchived] = useState<AppNotification[]>([])
  const [snoozed, setSnoozed] = useState<AppNotification[]>([])
  const [prefs, setPrefs] = useState<NotificationPreferences>(() => getPreferences())

  const refresh = useCallback(async () => {
    if (!userId) return
    const [a, ar, s] = await Promise.all([
      fetchActiveNotifications(userId),
      fetchArchivedNotifications(userId),
      fetchSnoozedNotifications(userId),
    ])
    setActive(sortByPriority(a))
    setArchived(ar)
    setSnoozed(s)
    setPrefs(getPreferences())
  }, [userId])

  useEffect(() => {
    refresh()
    // Poll for snoozed notification expiry every 30s
    const interval = setInterval(async () => {
      const count = await unsnoozeExpiredDb()
      if (count > 0) refresh()
    }, 30_000)
    return () => clearInterval(interval)
  }, [refresh])

  const markRead = useCallback(async (id: string) => {
    setActive(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    await markAsReadDb(id)
  }, [])

  const markAllRead = useCallback(async () => {
    setActive(prev => prev.map(n => ({ ...n, read: true })))
    await markAllAsReadDb()
  }, [])

  const remove = useCallback(async (id: string) => {
    setActive(prev => prev.filter(n => n.id !== id))
    await removeNotificationDb(id)
  }, [])

  const archive = useCallback(async (id: string) => {
    setActive(prev => prev.filter(n => n.id !== id))
    await archiveNotificationDb(id)
  }, [])

  const archiveRead = useCallback(async () => {
    setActive(prev => prev.filter(n => !n.read))
    await archiveAllReadDb()
  }, [])

  const snooze = useCallback(async (id: string, minutes: number) => {
    const until = new Date(Date.now() + minutes * 60 * 1000)
    setActive(prev => prev.filter(n => n.id !== id))
    await snoozeNotificationDb(id, until)
  }, [])

  const notify = useCallback(async (
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
    if (!userId) return null
    if (!prefs.enabled) return null
    const type = options?.type ?? 'general'
    if (!prefs.types[type]) return null
    const channel = options?.channel ?? 'in_app'
    if (!prefs.channels[channel]) return null

    const result = await addNotificationToDb(userId, {
      title,
      body,
      channel,
      priority: options?.priority ?? 0,
      type,
      groupKey: options?.groupKey,
      actionUrl: options?.actionUrl,
      icon: options?.icon,
      metadata: options?.metadata,
      snoozedUntil: null,
    })
    if (result) {
      setActive(prev => sortByPriority([result, ...prev]))
    }
    return result
  }, [userId, prefs])

  const updatePreferences = useCallback((updates: Partial<NotificationPreferences>) => {
    const updated = setPreferencesLocal(updates)
    setPrefs(updated)
  }, [])

  const groups: NotificationGroup[] = getSmartGroups(active)
  const unreadCount = active.filter(n => !n.read).length

  return {
    active,
    archived,
    snoozed,
    groups,
    unreadCount,
    preferences: prefs,
    list: active,
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
