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

const PROMPTS_KEY = ['nightworker', 'prompts']

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
    queryFn: () => apiFetch<HealthResponse>('/health', { skipAuth: true }),
    refetchInterval: 10000,
    staleTime: 5000,
    // Só chama quando já tem token (evita GET localhost:5555/health em deploy e ERR_CONNECTION_REFUSED)
    enabled: isConnected,
  })
}

export function usePromptsQuery(pollMs = 15000) {
  const { apiFetch, isConnected, config } = useNightWorker()

  console.log('[usePromptsQuery] Hook called', {
    isConnected,
    baseUrl: config.baseUrl,
    pollMs
  })

  return useQuery<PromptItem[]>({
    queryKey: PROMPTS_KEY,
    queryFn: async () => {
      console.log('[usePromptsQuery] Starting fetch to /prompts')

      try {
        // The API may return { total, providers, prompts: [...] } or a plain array
        const raw = await apiFetch<PromptsListResponse | PromptItem[]>('/prompts')

        console.log('[usePromptsQuery] Raw response:', raw)

        // Handle wrapped response
        const items = Array.isArray(raw) ? raw : (raw as PromptsListResponse).prompts ?? []

        console.log('[usePromptsQuery] Parsed items count:', items.length)

        const mapped = items.map((item: any) => ({
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

        console.log('[usePromptsQuery] Mapped items:', mapped)

        return mapped
      } catch (error) {
        console.error('[usePromptsQuery] Error fetching prompts:', error)
        throw error
      }
    },
    enabled: isConnected,
    refetchInterval: pollMs,
    staleTime: 3000,
    onSuccess: (items) => console.info('[NightWorker] ✓ fetched prompts', { count: items.length }),
    onError: (err) => console.error('[NightWorker] ✗ prompts error', err),
  })
}

export function usePromptStatusQuery(id?: string) {
  const { apiFetch } = useNightWorker()
  return useQuery<PromptItem>({
    queryKey: ['nightworker', 'prompt', id],
    queryFn: async () => {
      const raw = await apiFetch<PromptDetail & Record<string, unknown>>(`/prompts/${id}/status`)
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
    onSuccess: (data) => console.info('[NightWorker] prompt status', { id: data.id, status: data.status }),
    onError: (err) => console.error('[NightWorker] prompt status error', err),
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
