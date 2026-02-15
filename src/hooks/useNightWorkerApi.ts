import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNightWorker, ApiError } from '@/contexts/NightWorkerContext'
import type {
  CreatePromptResponse,
  HealthResponse,
  LogEntry,
  NightWorkerProject,
  PipelineConfig,
  PromptDetail,
  PromptItem,
  PromptsListResponse,
} from '@/types/night-worker'

const PROMPTS_KEY_BASE = ['nightworker', 'prompts'] as const

function promptsQueryKey(baseUrl: string) {
  return [...PROMPTS_KEY_BASE, baseUrl] as const
}

interface UsePromptsQueryOptions {
  enabled?: boolean
  staleTimeMs?: number
  refetchOnMount?: boolean | 'always'
  refetchOnWindowFocus?: boolean
}

function normalizePromptItem(item: any): PromptItem {
  return {
    id: item.id,
    name: item.name ?? item.filename?.replace(/\.txt$/i, '') ?? 'sem-nome',
    provider: item.provider,
    status: item.status,
    queue_stage: item.queue_stage ?? (item.status === 'pending' ? 'prioritized' : undefined),
    priority_order: item.priority_order ?? null,
    cloned_from: item.cloned_from ?? null,
    content: item.content,
    target_folder: item.target_folder,
    created_at: item.created_at,
    updated_at: item.updated_at,
    result_path: item.result_path ?? item.path ?? null,
    result_content: item.result_content ?? item.result ?? null,
    error: item.error ?? null,
    attempts: item.attempts,
    next_retry_at: item.next_retry_at ?? null,
    filename: item.filename,
    has_result: item.has_result ?? (item.result != null),
    pipeline_config: item.pipeline_config ?? null,
    pipeline_id: item.pipeline_id ?? null,
    pipeline_step: item.pipeline_step ?? null,
    pipeline_total_steps: item.pipeline_total_steps ?? null,
    pipeline_template_name: item.pipeline_template_name ?? null,
    project_id: item.project_id ?? null,
  } satisfies PromptItem
}

function normalizeProjectItem(item: any): NightWorkerProject {
  const status = item.status === 'archived' || item.status === 'paused' ? item.status : 'active'
  return {
    id: item.id,
    name: item.name ?? 'sem-nome',
    description: item.description ?? null,
    default_target_folder: item.default_target_folder ?? null,
    status,
    created_at: item.created_at ?? new Date().toISOString(),
    updated_at: item.updated_at ?? item.created_at ?? new Date().toISOString(),
    stats: item.stats
      ? {
          total: Number(item.stats.total ?? 0),
          pending: Number(item.stats.pending ?? 0),
          processing: Number(item.stats.processing ?? 0),
          done: Number(item.stats.done ?? 0),
          failed: Number(item.stats.failed ?? 0),
        }
      : undefined,
  }
}

export function useHealthQuery() {
  const { apiFetch, config, isConnected } = useNightWorker()
  return useQuery<HealthResponse>({
    queryKey: ['nightworker', 'health', config.baseUrl],
    queryFn: async () => {
      try {
        return await apiFetch<HealthResponse>('/health', { skipAuth: true })
      } catch (error) {
        // Edge-only environments may not expose /health yet.
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
    refetchInterval: 10000,
    staleTime: 5000,
    // Only call when connected to avoid localhost errors in deploy.
    enabled: isConnected,
  })
}

export function usePromptsQuery(pollMs = 15000, options: UsePromptsQueryOptions = {}) {
  const { apiFetch, isConnected, config } = useNightWorker()
  const {
    enabled = true,
    staleTimeMs = 5000, // Reduced from 30s to 5s to ensure polling works
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
        // The API may return { total, prompts: [...] } or a plain array.
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
    // Keep default poll for pending items; slow down when idle.
    refetchInterval: (query) => {
      const hasActive = query.state.data?.some((p) => p.status === 'pending' || p.status === 'processing')
      return hasActive ? pollMs : Math.max(pollMs, 30000)
    },
    staleTime: staleTimeMs,
    gcTime: 5 * 60 * 1000,
    // Refetch on window focus only when there are pending prompts
    refetchOnWindowFocus: (query) => {
      const hasActive = query.state.data?.some((p) => p.status === 'pending' || p.status === 'processing')
      return hasActive || refetchOnWindowFocus
    },
    refetchOnMount,
    placeholderData: (previousData) => previousData,
    retry: (failureCount, error) => {
      // Don't retry on timeout or auth errors
      if (error instanceof ApiError && (error.status === 408 || error.status === 401)) return false
      return failureCount < 2
    },
  })
}

export function usePromptStatusQuery(id?: string) {
  const { apiFetch } = useNightWorker()
  return useQuery<PromptItem>({
    queryKey: ['nightworker', 'prompt', id],
    queryFn: async () => {
      try {
        // Try Edge contract first: GET /prompts/:id
        const raw = await apiFetch<PromptDetail & Record<string, unknown>>(`/prompts/${id}`)
        return normalizePromptItem(raw)
      } catch (error) {
        // Fallback for api_server.py: try GET /prompts/:id/status
        if (error instanceof ApiError && error.status === 404) {
          try {
            const fallback = await apiFetch<any>(`/prompts/${id}/status`)
            return normalizePromptItem(fallback)
          } catch {
            // If both fail, re-throw original error
            throw error
          }
        }
        throw error
      }
    },
    enabled: Boolean(id),
    // Slower polling (15s) to avoid duplicate requests with list query (10s)
    refetchInterval: (query) => {
      const d = query.state.data
      return d?.status === 'pending' || d?.status === 'processing' ? 15000 : false
    },
    staleTime: 5000,
  })
}

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
      return hasActive ? 10000 : 30000
    },
    staleTime: 5000,
  })
}

export function useProjectsQuery(status: 'active' | 'archived' | 'paused' | 'all' = 'active') {
  const { apiFetch, isConnected, config } = useNightWorker()
  return useQuery<NightWorkerProject[]>({
    queryKey: ['nightworker', 'projects', status, config.baseUrl],
    queryFn: async () => {
      const raw = await apiFetch<{ projects?: any[] } | any[]>(`/projects?status=${status}&include_stats=1`)
      const items = Array.isArray(raw) ? raw : raw.projects ?? []
      return items.map((item) => normalizeProjectItem(item))
    },
    enabled: isConnected,
    staleTime: 5000,
    refetchInterval: 15000,
  })
}

export function useProjectPromptsQuery(projectId?: string | null, limit = 30) {
  const { apiFetch, isConnected, config } = useNightWorker()
  return useQuery<PromptItem[]>({
    queryKey: ['nightworker', 'project-prompts', projectId, limit, config.baseUrl],
    queryFn: async () => {
      const raw = await apiFetch<PromptsListResponse | PromptItem[]>(
        `/prompts?project_id=${projectId}&limit=${Math.max(1, Math.min(100, limit))}`
      )
      const items = Array.isArray(raw) ? raw : (raw as PromptsListResponse).prompts ?? []
      return items.map((item: any) => normalizePromptItem(item))
    },
    enabled: isConnected && !!projectId,
    refetchInterval: (query) => {
      const hasActive = query.state.data?.some((p) => p.status === 'pending' || p.status === 'processing')
      return hasActive ? 10000 : 30000
    },
    staleTime: 5000,
  })
}

export function useCreatePromptMutation() {
  const { apiFetch } = useNightWorker()
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      provider: string
      name: string
      content: string
      target_folder: string
      pipeline_config?: PipelineConfig | Record<string, unknown>
      pipeline_id?: string
      pipeline_step?: number
      pipeline_total_steps?: number
      pipeline_template_name?: string
      queue_stage?: 'backlog' | 'prioritized'
      priority_order?: number | null
      project_id?: string | null
    }) =>
      apiFetch<CreatePromptResponse>('/prompts', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: PROMPTS_KEY_BASE })
    },
  })
}

export function useCreateProjectMutation() {
  const { apiFetch } = useNightWorker()
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      name: string
      description?: string | null
      default_target_folder?: string | null
      status?: 'active' | 'archived' | 'paused'
    }) =>
      apiFetch<NightWorkerProject>('/projects', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['nightworker', 'projects'] })
    },
  })
}

export function useUpdateProjectMutation() {
  const { apiFetch } = useNightWorker()
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      id: string
      name?: string
      description?: string | null
      default_target_folder?: string | null
      status?: 'active' | 'archived' | 'paused'
    }) =>
      apiFetch<NightWorkerProject>(`/projects/${body.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: body.name,
          description: body.description,
          default_target_folder: body.default_target_folder,
          status: body.status,
        }),
      }),
    onSuccess: (_data, vars) => {
      client.invalidateQueries({ queryKey: ['nightworker', 'projects'] })
      client.invalidateQueries({ queryKey: ['nightworker', 'project-prompts', vars.id] })
    },
  })
}

export function useMovePromptMutation() {
  const { apiFetch } = useNightWorker()
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: { id: string; stage: 'backlog' | 'prioritized'; priority_order?: number | null }) =>
      apiFetch(`/prompts/${body.id}/move`, {
        method: 'POST',
        body: JSON.stringify({ stage: body.stage, priority_order: body.priority_order ?? undefined }),
      }),
    onSuccess: (_data, vars) => {
      client.invalidateQueries({ queryKey: PROMPTS_KEY_BASE })
      client.invalidateQueries({ queryKey: ['nightworker', 'prompt', vars.id] })
    },
  })
}

export function useReorderPrioritizedMutation() {
  const { apiFetch } = useNightWorker()
  const client = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) =>
      apiFetch('/prompts/reorder', {
        method: 'POST',
        body: JSON.stringify({ ids }),
      }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: PROMPTS_KEY_BASE })
    },
  })
}

export function useEditPromptMutation() {
  const { apiFetch } = useNightWorker()
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: { id: string; name?: string; content?: string; target_folder?: string | null }) =>
      apiFetch(`/prompts/${body.id}/edit`, {
        method: 'POST',
        body: JSON.stringify({
          name: body.name,
          content: body.content,
          target_folder: body.target_folder,
        }),
      }),
    onSuccess: (_data, vars) => {
      client.invalidateQueries({ queryKey: PROMPTS_KEY_BASE })
      client.invalidateQueries({ queryKey: ['nightworker', 'prompt', vars.id] })
    },
  })
}

export function useReprocessPromptMutation() {
  const { apiFetch } = useNightWorker()
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: { id: string; name?: string }) =>
      apiFetch<{ id: string }>(`/prompts/${body.id}/reprocess`, {
        method: 'POST',
        body: JSON.stringify({ name: body.name }),
      }),
    onSuccess: (_data, vars) => {
      client.invalidateQueries({ queryKey: PROMPTS_KEY_BASE })
      client.invalidateQueries({ queryKey: ['nightworker', 'prompt', vars.id] })
    },
  })
}

export function useCreateWorkerTokenMutation() {
  const { apiFetch } = useNightWorker()
  return useMutation({
    mutationFn: (body: { worker_name: string; scopes?: string[]; expires_in_hours?: number; notes?: string }) =>
      apiFetch<{
        id: string
        worker_name: string
        scopes: string[]
        created_at: string
        expires_at: string | null
        token: string
      }>('/worker-tokens', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  })
}

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
    // Disable completely on Supabase to avoid 404 console spam
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
