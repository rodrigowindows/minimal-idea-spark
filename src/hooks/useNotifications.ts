import { useState, useEffect, useCallback } from 'react'
import {
  getStoredNotifications,
  markAsRead,
  markAllAsRead,
  removeNotification,
  addNotification,
  type AppNotification,
} from '@/lib/notifications/manager'
import { sortByPriority } from '@/lib/notifications/priority-engine'

export function useNotifications() {
  const [list, setList] = useState<AppNotification[]>(() => sortByPriority(getStoredNotifications()))

  const refresh = useCallback(() => {
    setList(sortByPriority(getStoredNotifications()))
  }, [])

  useEffect(() => {
    refresh()
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

  const notify = useCallback((title: string, body: string, priority = 0) => {
    addNotification({ title, body, channel: 'in_app', priority })
    refresh()
  }, [refresh])

  const unreadCount = list.filter(n => !n.read).length

  return { list, unreadCount, markRead, markAllRead, remove, notify, refresh }
}
