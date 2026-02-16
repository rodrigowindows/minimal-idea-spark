import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { ApiError, useNightWorker } from '@/contexts/NightWorkerContext'
import { getDefaultPipelineTemplates } from '@/lib/nightworker/pipelineTemplates'
import type { PipelineTemplate } from '@/types/night-worker'

import { normalizeTemplateItem, TEMPLATES_KEY_BASE } from './shared'

export function useTemplatesQuery() {
  const { apiFetch, isConnected, config } = useNightWorker()

  return useQuery<PipelineTemplate[]>({
    queryKey: [...TEMPLATES_KEY_BASE, config.baseUrl],
    queryFn: async () => {
      const fetchTemplates = async () => {
        const raw = await apiFetch<{ templates?: any[] } | any[]>('/templates')
        const items = Array.isArray(raw) ? raw : raw.templates ?? []
        return items.map((item) => normalizeTemplateItem(item))
      }

      try {
        return await fetchTemplates()
      } catch (error) {
        if (error instanceof ApiError && (error.status === 404 || error.status === 501)) {
          return getDefaultPipelineTemplates()
        }
        throw error
      }
    },
    enabled: isConnected,
    staleTime: 5000,
    refetchInterval: 30000,
  })
}

export function useCreateTemplateMutation() {
  const { apiFetch } = useNightWorker()
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; description?: string | null; steps: unknown[]; is_default?: boolean }) =>
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
    mutationFn: (body: { id: string; name?: string; description?: string | null; steps?: unknown[]; is_default?: boolean }) =>
      apiFetch<PipelineTemplate>(`/templates/${body.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: body.name,
          description: body.description,
          steps: body.steps,
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
