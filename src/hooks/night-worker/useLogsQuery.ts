import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import { ApiError, useNightWorker } from '@/contexts/NightWorkerContext'
import type { LogEntry } from '@/types/night-worker'

export function useLogsQuery(
  params: { worker: string; level?: string; lines?: number; since?: string },
  options?: { enabled?: boolean; refetchInterval?: number }
) {
  const { apiFetch, isConnected, config } = useNightWorker()
  const isSupabase = config.baseUrl.includes('.supabase.co')

  const queryString = useMemo(() => {
    const qs = new URLSearchParams()
    if (params.worker && params.worker !== 'all') qs.set('worker', params.worker)
    if (params.level && params.level !== 'ALL') qs.set('level', params.level)
    if (params.lines) qs.set('lines', String(params.lines))
    if (params.since) qs.set('since', params.since)
    return qs.toString()
  }, [params.level, params.lines, params.since, params.worker])

  return useQuery<LogEntry[]>({
    queryKey: ['nightworker', 'logs', queryString],
    queryFn: () =>
      apiFetch<LogEntry[]>(`/logs${queryString ? `?${queryString}` : ''}`, {
        retry: 1,
        silentStatuses: [404],
      }),
    enabled: (options?.enabled ?? true) && isConnected && !isSupabase,
    refetchInterval: (query) => {
      if (query.state.error instanceof ApiError && query.state.error.status === 404) return false
      return options?.refetchInterval ?? 5000
    },
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 404) return false
      return failureCount < 3
    },
  })
}
