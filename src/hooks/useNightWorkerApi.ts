import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNightWorker, ApiError } from '@/contexts/NightWorkerContext'
import type { HealthResponse, LogEntry, PromptItem } from '@/types/night-worker'

const PROMPTS_KEY = ['nightworker', 'prompts']

export function useHealthQuery() {
  const { apiFetch, config } = useNightWorker()
  return useQuery<HealthResponse>({
    queryKey: ['nightworker', 'health', config.baseUrl],
    queryFn: () => apiFetch<HealthResponse>('/health', { skipAuth: true }),
    refetchInterval: 10000,
    staleTime: 5000,
  })
}

export function usePromptsQuery(pollMs = 15000) {
  const { apiFetch, isConnected } = useNightWorker()
  return useQuery<PromptItem[]>({
    queryKey: PROMPTS_KEY,
    queryFn: () => apiFetch<PromptItem[]>('/prompts'),
    refetchInterval: pollMs,
    staleTime: 3000,
    enabled: isConnected,
  })
}

export function usePromptStatusQuery(id?: string) {
  const { apiFetch, isConnected } = useNightWorker()
  return useQuery<PromptItem>({
    queryKey: ['nightworker', 'prompt', id],
    queryFn: () => apiFetch<PromptItem>(`/prompts/${id}/status`),
    enabled: Boolean(id) && isConnected,
    refetchInterval: (data) => (data?.status === 'pending' ? 5000 : false),
    staleTime: 2000,
  })
}

export function useCreatePromptMutation() {
  const { apiFetch } = useNightWorker()
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: { provider: string; name: string; content: string; target_folder: string }) =>
      apiFetch<{ id: string }>('/prompts', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: PROMPTS_KEY })
    },
  })
}

export function useLogsQuery(
  params: { worker: string; level?: string; lines?: number; since?: string },
  options?: { enabled?: boolean; refetchInterval?: number }
) {
  const { apiFetch, isConnected } = useNightWorker()
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
      apiFetch<LogEntry[]>(`/logs${queryString ? `?${queryString}` : ''}`),
    enabled: (options?.enabled ?? true) && isConnected,
    refetchInterval: options?.refetchInterval ?? 5000,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 404) return false
      return failureCount < 3
    },
  })
}
