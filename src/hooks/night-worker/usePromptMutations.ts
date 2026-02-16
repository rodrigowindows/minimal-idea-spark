import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useNightWorker } from '@/contexts/NightWorkerContext'
import type { CreatePromptResponse, PipelineConfig } from '@/types/night-worker'

import { PROMPTS_KEY_BASE } from './shared'

export function useCreatePromptMutation() {
  const { apiFetch } = useNightWorker()
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      provider: string
      name: string
      content: string
      target_folder: string
      pipeline_config?: PipelineConfig
      pipeline_id?: string
      pipeline_step?: number
      pipeline_total_steps?: number
      pipeline_template_name?: string
      queue_stage?: 'backlog' | 'prioritized'
      priority_order?: number | null
      project_id?: string | null
      template_id?: string | null
      template_version?: number | null
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
