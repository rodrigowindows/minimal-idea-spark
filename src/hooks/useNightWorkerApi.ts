import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNightWorker, ApiError } from '@/contexts/NightWorkerContext'
import type {
  CreatePromptResponse,
  HealthResponse,
  LogEntry,
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

/**
 * Extracts a human-readable name from a filename like "a1b2c3d4_nome-do-prompt.txt"
 */
function nameFromFilename(filename?: string): string {
  if (!filename) return 'sem-nome'
  // Remove ID prefix (anything before first underscore) and .txt extension
  const withoutExt = filename.replace(/\.txt$/i, '')
  const underscoreIdx = withoutExt.indexOf('_')
  return underscoreIdx >= 0 ? withoutExt.substring(underscoreIdx + 1) : withoutExt
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
    staleTimeMs = 30000,
    refetchOnMount = false,
    refetchOnWindowFocus = false,
  } = options

  console.log('[usePromptsQuery] Hook called', {
    isConnected,
    enabled: isConnected && enabled,
    baseUrl: config.baseUrl,
    pollMs,
    timestamp: new Date().toISOString()
  })

  return useQuery<PromptItem[]>({
    queryKey: promptsQueryKey(config.baseUrl),
    queryFn: async () => {
      console.log('[usePromptsQuery] 🚀 Starting fetch', {
        url: `${config.baseUrl}/prompts`,
        timestamp: new Date().toISOString()
      })

      try {
        // The API may return { total, prompts: [...] } or a plain array.
        const raw = await apiFetch<PromptsListResponse | PromptItem[]>('/prompts')

        console.log('[usePromptsQuery] ✅ Response received', {
          type: Array.isArray(raw) ? 'array' : 'object',
          timestamp: new Date().toISOString()
        })

        const items = Array.isArray(raw) ? raw : (raw as PromptsListResponse).prompts ?? []

        console.log('[usePromptsQuery] 📦 Mapping', items.length, 'items')

        return items.map((item: any) => ({
          id: item.id,
          name: item.name || nameFromFilename(item.filename),
          provider: item.provider,
          status: item.status,
          content: item.content,
          target_folder: item.target_folder,
          created_at: item.created_at,
          updated_at: item.updated_at,
          result_path: item.result_path ?? item.path ?? null,
          result_content: item.result_content ?? item.result ?? null,
          error: item.error ?? null,
          attempts: item.attempts,
          next_retry_at: item.next_retry_at,
          filename: item.filename,
          has_result: item.has_result ?? (item.result != null),
        } satisfies PromptItem))
      } catch (error) {
        console.error('[usePromptsQuery] ❌ Error', {
          error,
          name: error?.constructor?.name,
          message: error instanceof Error ? error.message : String(error),
          status: (error as any)?.status,
          timestamp: new Date().toISOString()
        })
        throw error
      }
    },
    enabled: isConnected && enabled,
    // Keep default poll for pending items; slow down when idle.
    refetchInterval: (query) => {
      const hasPending = query.state.data?.some((p) => p.status === 'pending')
      return hasPending ? pollMs : Math.max(pollMs, 30000)
    },
    staleTime: staleTimeMs,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus,
    refetchOnMount,
    placeholderData: (previousData) => previousData,
  })
}

export function usePromptStatusQuery(id?: string) {
  const { apiFetch } = useNightWorker()
  return useQuery<PromptItem>({
    queryKey: ['nightworker', 'prompt', id],
    queryFn: async () => {
      const raw = await apiFetch<PromptDetail & Record<string, unknown>>(`/prompts/${id}`)
      return {
        id: raw.id,
        name: (raw as any).name || nameFromFilename(raw.filename),
        provider: raw.provider,
        status: raw.status,
        content: raw.content ?? null,
        target_folder: (raw as any).target_folder ?? null,
        created_at: (raw as any).created_at,
        updated_at: (raw as any).updated_at,
        result_path: raw.path ?? (raw as any).result_path ?? null,
        result_content: raw.result ?? (raw as any).result_content ?? null,
        error: (raw as any).error ?? null,
        attempts: (raw as any).attempts,
        filename: raw.filename,
      } satisfies PromptItem
    },
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const d = query.state.data
      return d?.status === 'pending' ? 5000 : false
    },
    staleTime: 2000,
  })
}

export function useCreatePromptMutation() {
  const { apiFetch } = useNightWorker()
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: { provider: string; name: string; content: string; target_folder: string }) =>
      apiFetch<CreatePromptResponse>('/prompts', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: PROMPTS_KEY_BASE })
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
      apiFetch<LogEntry[]>(`/logs${queryString ? `?${queryString}` : ''}`, {
        retry: 1,
        silentStatuses: [404],
      }),
    enabled: (options?.enabled ?? true) && isConnected,
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
