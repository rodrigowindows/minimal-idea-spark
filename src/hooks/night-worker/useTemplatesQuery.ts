import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'

import { ApiError, useNightWorker } from '@/contexts/NightWorkerContext'
import { getDefaultPipelineTemplates } from '@/lib/nightworker/pipelineTemplates'
import type { PipelineContextMode, PipelineTemplate } from '@/types/night-worker'

import { normalizeTemplateItem, TEMPLATES_KEY_BASE } from './shared'

const LOG = '[nightworker/templates]'

function normName(name: string) {
  return name.trim().toLowerCase()
}

/**
 * Sync missing default templates to the backend.
 * Runs at most once per hook instance to avoid repeated POST storms on every
 * React Query refetch / window-focus / interval.
 */
async function syncDefaults(
  apiFetch: ReturnType<typeof useNightWorker>['apiFetch'],
  templates: PipelineTemplate[],
  baseUrl: string,
): Promise<boolean> {
  const defaults = getDefaultPipelineTemplates()
  const existingNames = new Set(templates.map((t) => normName(t.name)))
  const missing = defaults.filter((d) => !existingNames.has(normName(d.name)))

  if (missing.length === 0) return false

  if (import.meta.env.DEV) {
    console.info(`${LOG} syncing ${missing.length} missing defaults`, {
      names: missing.map((d) => d.name),
      baseUrl,
    })
  }

  let createdCount = 0

  await Promise.all(
    missing.map(async (tpl) => {
      try {
        const created = await apiFetch<PipelineTemplate | null>('/templates', {
          method: 'POST',
          body: JSON.stringify({
            name: tpl.name,
            description: tpl.description,
            steps: tpl.steps,
            context_mode: tpl.context_mode,
            is_default: true,
          }),
        })

        if (created && typeof created === 'object') {
          createdCount += 1
        }
      } catch (err) {
        // Another tab/client already created it — safe to ignore.
        if (err instanceof ApiError && (err.status === 400 || err.status === 409)) {
          if (import.meta.env.DEV) {
            console.warn(`${LOG} create skipped (already exists)`, { name: tpl.name })
          }
          return
        }

        // Sync must not break template reads.
        console.warn(`${LOG} create failed`, {
          name: tpl.name,
          baseUrl,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }),
  )

  return createdCount > 0
}

export function useTemplatesQuery() {
  const { apiFetch, isConnected, config } = useNightWorker()
  const syncedRef = useRef(false)

  return useQuery<PipelineTemplate[]>({
    queryKey: [...TEMPLATES_KEY_BASE, config.baseUrl],
    queryFn: async () => {
      const start = performance.now()

      const fetchTemplates = async () => {
        const raw = await apiFetch<{ templates?: any[] } | any[]>('/templates')
        if (!raw) return []
        const items = Array.isArray(raw) ? raw : Array.isArray(raw.templates) ? raw.templates : []
        return items.map((item) => normalizeTemplateItem(item))
      }

      try {
        let templates = await fetchTemplates()

        // Sync defaults only once per component mount to avoid repeated
        // writes on every refetch interval / window-focus.
        if (!syncedRef.current) {
          syncedRef.current = true
          const didSync = await syncDefaults(apiFetch, templates, config.baseUrl)
          if (didSync) {
            try {
              const refreshed = await fetchTemplates()
              // Keep pre-sync data if refresh unexpectedly returns empty.
              if (refreshed.length > 0 || templates.length === 0) {
                templates = refreshed
              }
            } catch (refreshError) {
              console.warn(`${LOG} refresh after sync failed`, {
                baseUrl: config.baseUrl,
                error: refreshError instanceof Error ? refreshError.message : String(refreshError),
              })
            }
          }
        }

        const elapsedMs = Math.round(performance.now() - start)
        if (import.meta.env.DEV || elapsedMs >= 1000) {
          console.info(`${LOG} loaded`, { elapsedMs, count: templates.length })
        }
        return templates
      } catch (error) {
        if (error instanceof ApiError && (error.status === 404 || error.status === 501)) {
          if (import.meta.env.DEV) {
            console.warn(`${LOG} backend unavailable, using local defaults`, {
              status: error.status,
            })
          }
          return getDefaultPipelineTemplates()
        }
        throw error
      }
    },
    enabled: isConnected,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

export function useCreateTemplateMutation() {
  const { apiFetch } = useNightWorker()
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; description?: string | null; steps: unknown[]; context_mode?: PipelineContextMode; is_default?: boolean }) =>
      apiFetch<PipelineTemplate>('/templates', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: TEMPLATES_KEY_BASE })
    },
  })
}

export function useUpdateTemplateMutation() {
  const { apiFetch } = useNightWorker()
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: { id: string; name?: string; description?: string | null; steps?: unknown[]; context_mode?: PipelineContextMode; is_default?: boolean }) =>
      apiFetch<PipelineTemplate>(`/templates/${body.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: body.name,
          description: body.description,
          steps: body.steps,
          context_mode: body.context_mode,
          is_default: body.is_default,
        }),
      }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: TEMPLATES_KEY_BASE })
    },
  })
}

export function useDeleteTemplateMutation() {
  const { apiFetch } = useNightWorker()
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: { id: string }) =>
      apiFetch<{ id: string; deleted: boolean }>(`/templates/${body.id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: TEMPLATES_KEY_BASE })
    },
  })
}
