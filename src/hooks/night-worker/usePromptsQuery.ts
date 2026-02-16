import { useQuery } from '@tanstack/react-query'

import { ApiError, useNightWorker } from '@/contexts/NightWorkerContext'
import type { PromptItem, PromptsListResponse } from '@/types/night-worker'

import { normalizePromptItem, promptsQueryKey, type UsePromptsQueryOptions } from './shared'

export function usePromptsQuery(pollMs = 15000, options: UsePromptsQueryOptions = {}) {
  const { apiFetch, isConnected, config } = useNightWorker()
  const {
    enabled = true,
    staleTimeMs = 5000,
    refetchOnMount = false,
    refetchOnWindowFocus = false,
  } = options

  if (import.meta.env.DEV) {
    console.debug('[usePromptsQuery] Hook called', {
      isConnected,
      enabled: isConnected && enabled,
      baseUrl: config.baseUrl,
      pollMs,
    })
  }

  return useQuery<PromptItem[]>({
    queryKey: promptsQueryKey(config.baseUrl),
    queryFn: async () => {
      if (import.meta.env.DEV) {
        console.debug('[usePromptsQuery] Starting fetch', { url: `${config.baseUrl}/prompts` })
      }

      try {
        const raw = await apiFetch<PromptsListResponse | PromptItem[]>('/prompts')
        const items = Array.isArray(raw) ? raw : (raw as PromptsListResponse).prompts ?? []

        if (import.meta.env.DEV) {
          console.debug('[usePromptsQuery] Received', items.length, 'items')
        }

        return items.map((item: any) => normalizePromptItem(item))
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[usePromptsQuery] Error', {
            message: error instanceof Error ? error.message : String(error),
            status: (error as any)?.status,
          })
        }
        throw error
      }
    },
    enabled: isConnected && enabled,
    refetchInterval: (query) => {
      const hasActive = query.state.data?.some((p) => p.status === 'pending' || p.status === 'processing')
      return hasActive ? pollMs : Math.max(pollMs, 30000)
    },
    staleTime: staleTimeMs,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: (query) => {
      const hasActive = query.state.data?.some((p) => p.status === 'pending' || p.status === 'processing')
      return hasActive || refetchOnWindowFocus
    },
    refetchOnMount,
    placeholderData: (previousData) => previousData,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && (error.status === 408 || error.status === 401)) return false
      return failureCount < 2
    },
  })
}
