import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'

const STORAGE_KEY_BASE = 'lifeos_recent_pages'
const DEFAULT_MAX_RECENT = 5

export interface RecentPage {
  path: string
  label?: string
  labelKey?: string
  timestamp: number
}

interface UseRecentPagesOptions {
  max?: number
  userId?: string | null
}

/** Persist and return recent page visits for sidebar or command palette. */
export function useRecentPages(
  navItems: { to: string; labelKey: string }[],
  t: (key: string) => string,
  options?: UseRecentPagesOptions
) {
  const { pathname } = useLocation()
  const max = options?.max ?? DEFAULT_MAX_RECENT
  const storageKey = useMemo(
    () => (options?.userId ? `${STORAGE_KEY_BASE}_${options.userId}` : STORAGE_KEY_BASE),
    [options?.userId]
  )

  const resolveLabelKey = useCallback(
    (path: string) => {
      const match = navItems.find((n) => n.to === path || (path.startsWith(n.to + '/') && n.to !== '/'))
      return match?.labelKey
    },
    [navItems]
  )

  const [recent, setRecent] = useState<RecentPage[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return []
      const parsed = JSON.parse(raw) as RecentPage[]
      if (!Array.isArray(parsed)) return []
      return parsed
        .slice(0, max)
        .map((item) => ({
          ...item,
          labelKey: item.labelKey ?? resolveLabelKey(item.path),
          label: item.label ?? (item.labelKey ? t(item.labelKey) : item.path),
        }))
    } catch {
      return []
    }
  })

  // Re-hydrate labels on language change so the "Recent" list follows i18n
  useEffect(() => {
    setRecent((prev) =>
      prev.map((item) => ({
        ...item,
        label: item.labelKey ? t(item.labelKey) : item.label ?? item.path,
      }))
    )
  }, [t])

  useEffect(() => {
    if (!pathname || pathname === '/auth' || pathname.startsWith('/invite') || pathname.startsWith('/shared')) return
    const item = navItems.find((n) => n.to === pathname || (pathname.startsWith(n.to + '/') && n.to !== '/'))
    const labelKey = item?.labelKey ?? resolveLabelKey(pathname)
    const label = labelKey ? t(labelKey) : pathname
    setRecent((prev) => {
      const filtered = prev.filter((p) => p.path !== pathname)
      const next = [{ path: pathname, labelKey, label, timestamp: Date.now() }, ...filtered].slice(0, max)
      try {
        localStorage.setItem(storageKey, JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }, [pathname, navItems, t, max, storageKey, resolveLabelKey])

  const clearRecent = useCallback(() => {
    setRecent([])
    try {
      localStorage.removeItem(storageKey)
    } catch {
      /* ignore */
    }
  }, [storageKey])

  return { recentPages: recent, clearRecent }
}
