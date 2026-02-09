/**
 * Hook to read entity data from IndexedDB offline cache.
 * Provides cached data when offline, falls back to live data when online.
 */

import { useEffect, useState, useCallback } from 'react'
import { getAll, getById, putMany, type StoreName } from '@/lib/offline/offline-db'
import { useOnlineStatus } from './useOnlineStatus'

/**
 * Returns all items from the given offline cache store.
 * Refreshes when connectivity changes.
 */
export function useOfflineCacheAll<T = Record<string, unknown>>(store: StoreName) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const isOnline = useOnlineStatus()

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const items = await getAll<T>(store)
      setData(items)
    } catch {
      setData([])
    } finally {
      setLoading(false)
    }
  }, [store])

  useEffect(() => {
    refresh()
  }, [refresh, isOnline])

  return { data, loading, refresh }
}

/**
 * Returns a single item from the offline cache by ID.
 */
export function useOfflineCacheItem<T = Record<string, unknown>>(store: StoreName, id: string | null) {
  const [data, setData] = useState<T | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const isOnline = useOnlineStatus()

  const refresh = useCallback(async () => {
    if (!id) {
      setData(undefined)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const item = await getById<T>(store, id)
      setData(item)
    } catch {
      setData(undefined)
    } finally {
      setLoading(false)
    }
  }, [store, id])

  useEffect(() => {
    refresh()
  }, [refresh, isOnline])

  return { data, loading, refresh }
}

/**
 * Populates the offline cache from an array of items (e.g. after a Supabase query).
 * Call this whenever you fetch fresh data from the server.
 */
export function useCachePopulator<T = Record<string, unknown>>(store: StoreName) {
  return useCallback(
    async (items: T[]) => {
      if (items.length > 0) {
        await putMany(store, items)
      }
    },
    [store]
  )
}
