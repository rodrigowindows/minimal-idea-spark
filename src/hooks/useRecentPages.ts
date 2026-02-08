import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

const STORAGE_KEY = 'lifeos_recent_pages'
const MAX_RECENT = 5

export interface RecentPage {
  path: string
  label: string
  timestamp: number
}

/** Persist and return recent page visits for sidebar or command palette. */
export function useRecentPages(navItems: { to: string; labelKey: string }[], t: (key: string) => string) {
  const { pathname } = useLocation()
  const [recent, setRecent] = useState<RecentPage[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw) as RecentPage[]
      return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    if (!pathname || pathname === '/auth' || pathname.startsWith('/invite') || pathname.startsWith('/shared')) return
    const item = navItems.find((n) => n.to === pathname || (pathname.startsWith(n.to + '/') && n.to !== '/'))
    const label = item ? t(item.labelKey) : pathname
    setRecent((prev) => {
      const filtered = prev.filter((p) => p.path !== pathname)
      const next = [{ path: pathname, label, timestamp: Date.now() }, ...filtered].slice(0, MAX_RECENT)
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
