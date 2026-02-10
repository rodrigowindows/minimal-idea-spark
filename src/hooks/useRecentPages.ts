import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

const STORAGE_KEY = 'lifeos_recent_pages'
const MAX_RECENT = 5

export interface RecentPage {
  path: string
  label?: string
  labelKey?: string
  timestamp: number
}

/** Persist and return recent page visits for sidebar or command palette. */
export function useRecentPages(navItems: { to: string; labelKey: string }[], t: (key: string) => string) {
  const { pathname } = useLocation()
  const resolveLabelKey = useCallback(
    (path: string) => {
      const match = navItems.find((n) => n.to === path || (path.startsWith(n.to + '/') && n.to !== '/'))
      return match?.labelKey
    },
    [navItems]
  )
  const [recent, setRecent] = useState<RecentPage[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw) as RecentPage[]
      if (!Array.isArray(parsed)) return []
      return parsed
        .slice(0, MAX_RECENT)
        .map((item) => ({
          ...item,
          labelKey: item.labelKey ?? resolveLabelKey(item.path),
        }))
    } catch {
      return []
    }
  })

  useEffect(() => {
    if (!pathname || pathname === '/auth' || pathname.startsWith('/invite') || pathname.startsWith('/shared')) return
    const item = navItems.find((n) => n.to === pathname || (pathname.startsWith(n.to + '/') && n.to !== '/'))
    const labelKey = item?.labelKey
    const label = labelKey ? t(labelKey) : pathname
    setRecent((prev) => {
      const filtered = prev.filter((p) => p.path !== pathname)
      const next = [{ path: pathname, labelKey, label, timestamp: Date.now() }, ...filtered].slice(0, MAX_RECENT)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }, [pathname, navItems, t])

  const clearRecent = useCallback(() => {
    setRecent([])
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  return { recentPages: recent, clearRecent }
}
