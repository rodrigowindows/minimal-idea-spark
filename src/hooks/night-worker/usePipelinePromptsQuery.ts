import { useQuery } from '@tanstack/react-query'

import { useNightWorker } from '@/contexts/NightWorkerContext'
import type { PromptItem, PromptsListResponse } from '@/types/night-worker'

import { normalizePromptItem } from './shared'

export function usePipelinePromptsQuery(pipelineId?: string | null) {
  const { apiFetch, isConnected, config } = useNightWorker()
  return useQuery<PromptItem[]>({
    queryKey: ['nightworker', 'pipeline', pipelineId, config.baseUrl],
    queryFn: async () => {
      const raw = await apiFetch<PromptsListResponse | PromptItem[]>(
        `/prompts?pipeline_id=${pipelineId}&limit=50`
      )
      const items = Array.isArray(raw) ? raw : (raw as PromptsListResponse).prompts ?? []
      return items
        .map((item: any) => normalizePromptItem(item))
        .sort((a, b) => {
          const aStep = Number(a.pipeline_step ?? 0)
          const bStep = Number(b.pipeline_step ?? 0)
          if (aStep !== bStep) return aStep - bStep
          const aTime = new Date(a.updated_at || a.created_at || 0).getTime()
          const bTime = new Date(b.updated_at || b.created_at || 0).getTime()
          return bTime - aTime
        })
    },
    enabled: isConnected && !!pipelineId,
    refetchInterval: (query) => {
      const hasActive = query.state.data?.some((p) => p.status === 'pending' || p.status === 'processing')
      return hasActive ? 15_000 : 60_000
    },
    staleTime: 30_000,
  })
}
