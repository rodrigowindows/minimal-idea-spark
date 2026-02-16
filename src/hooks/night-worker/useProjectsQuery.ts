import { useQuery } from '@tanstack/react-query'

import { useNightWorker } from '@/contexts/NightWorkerContext'
import type { NightWorkerProject, PromptItem, PromptsListResponse } from '@/types/night-worker'

import { normalizeProjectItem, normalizePromptItem } from './shared'

export function useProjectsQuery(status: 'active' | 'archived' | 'paused' | 'all' = 'active') {
  const { apiFetch, isConnected, config } = useNightWorker()
  const safeStatus = encodeURIComponent(status)
  return useQuery<NightWorkerProject[]>({
    queryKey: ['nightworker', 'projects', status, config.baseUrl],
    queryFn: async () => {
      const raw = await apiFetch<{ projects?: any[] } | any[]>(`/projects?status=${safeStatus}&include_stats=1`)
      const items = Array.isArray(raw) ? raw : raw.projects ?? []
      return items.map((item) => normalizeProjectItem(item))
    },
    enabled: isConnected,
    staleTime: 60_000,
    refetchInterval: 30_000,
  })
}

export function useProjectPromptsQuery(projectId?: string | null, limit = 30) {
  const { apiFetch, isConnected, config } = useNightWorker()
  const safeProjectId = encodeURIComponent(projectId ?? '')
  const safeLimit = Math.max(1, Math.min(1000, limit))
  return useQuery<PromptItem[]>({
    queryKey: ['nightworker', 'project-prompts', projectId, limit, config.baseUrl],
    queryFn: async () => {
      const raw = await apiFetch<PromptsListResponse | PromptItem[]>(`/prompts?project_id=${safeProjectId}&limit=${safeLimit}`)
      const items = Array.isArray(raw) ? raw : (raw as PromptsListResponse).prompts ?? []
      return items.map((item: any) => normalizePromptItem(item))
    },
    enabled: isConnected && !!projectId,
    refetchInterval: (query) => {
      const hasActive = query.state.data?.some((p) => p.status === 'pending' || p.status === 'processing')
      return hasActive ? 15_000 : 60_000
    },
    staleTime: 30_000,
  })
}
