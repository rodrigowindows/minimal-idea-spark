import { useQuery } from '@tanstack/react-query'

import { ApiError, useNightWorker } from '@/contexts/NightWorkerContext'
import type { PromptDetail, PromptItem } from '@/types/night-worker'

import { normalizePromptItem } from './shared'

export function usePromptStatusQuery(id?: string) {
  const { apiFetch, config } = useNightWorker()
  const safeId = encodeURIComponent(id ?? '')
  return useQuery<PromptItem>({
    queryKey: ['nightworker', 'prompt', id, config.baseUrl],
    queryFn: async () => {
      try {
        const raw = await apiFetch<PromptDetail & Record<string, unknown>>(`/prompts/${safeId}`)
        return normalizePromptItem(raw)
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          try {
            const fallback = await apiFetch<any>(`/prompts/${safeId}/status`)
            return normalizePromptItem(fallback)
          } catch {
            throw error
          }
        }
        throw error
      }
    },
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const d = query.state.data
      if (d?.status === 'processing') return 5000
      if (d?.status === 'pending') return 15000
      return false
    },
    staleTime: 5000,
  })
}
