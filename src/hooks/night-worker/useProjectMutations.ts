import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useNightWorker } from '@/contexts/NightWorkerContext'
import type { NightWorkerProject } from '@/types/night-worker'

export function useCreateProjectMutation() {
  const { apiFetch } = useNightWorker()
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      name: string
      description?: string | null
      default_target_folder?: string | null
      status?: 'active' | 'archived' | 'paused'
      sla_timeout_seconds?: number
      sla_max_retries?: number
      sla_retry_delay_seconds?: number
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
      sla_timeout_seconds?: number
      sla_max_retries?: number
      sla_retry_delay_seconds?: number
    }) =>
      apiFetch<NightWorkerProject>(`/projects/${body.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: body.name,
          description: body.description,
          default_target_folder: body.default_target_folder,
          status: body.status,
          sla_timeout_seconds: body.sla_timeout_seconds,
          sla_max_retries: body.sla_max_retries,
          sla_retry_delay_seconds: body.sla_retry_delay_seconds,
        }),
      }),
    onSuccess: (_data, vars) => {
      client.invalidateQueries({ queryKey: ['nightworker', 'projects'] })
      client.invalidateQueries({ queryKey: ['nightworker', 'project-prompts', vars.id] })
    },
  })
}

export function useDeleteProjectMutation() {
  const { apiFetch } = useNightWorker()
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: { id: string }) =>
      apiFetch<{ id: string; deleted: boolean }>(`/projects/${body.id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['nightworker', 'projects'] })
    },
  })
}
