import { useQuery } from '@tanstack/react-query'

import { ApiError, useNightWorker } from '@/contexts/NightWorkerContext'
import type { PromptDetail, PromptItem } from '@/types/night-worker'

import { normalizePromptItem } from './shared'

export function usePromptStatusQuery(id?: string) {
  const { apiFetch } = useNightWorker()
  return useQuery<PromptItem>({
    queryKey: ['nightworker', 'prompt', id],
    queryFn: async () => {
      try {
        const raw = await apiFetch<PromptDetail & Record<string, unknown>>(`/prompts/${id}`)
        return normalizePromptItem(raw)
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          try {
            const fallback = await apiFetch<any>(`/prompts/${id}/status`)
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
      return d?.status === 'pending' || d?.status === 'processing' ? 15000 : false
    },
    staleTime: 5000,
  })
}
