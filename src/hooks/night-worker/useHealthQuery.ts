import { useQuery } from '@tanstack/react-query'

import { ApiError, useNightWorker } from '@/contexts/NightWorkerContext'
import type { HealthResponse } from '@/types/night-worker'

export function useHealthQuery() {
  const { apiFetch, config, isConnected } = useNightWorker()
  return useQuery<HealthResponse>({
    queryKey: ['nightworker', 'health', config.baseUrl],
    queryFn: async () => {
      try {
        return await apiFetch<HealthResponse>('/health', { skipAuth: true })
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return {
            status: 'ok',
            version: 'edge',
            providers: [],
            workers: [],
          }
        }
        throw error
      }
    },
    refetchInterval: 30_000,
    staleTime: 20_000,
    enabled: isConnected,
  })
}
