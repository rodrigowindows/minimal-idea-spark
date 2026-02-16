import type {
  NightWorkerProject,
  PipelineTemplate,
  PromptItem,
} from '@/types/night-worker'

export const PROMPTS_KEY_BASE = ['nightworker', 'prompts'] as const
export const TEMPLATES_KEY_BASE = ['nightworker', 'templates'] as const

export function promptsQueryKey(baseUrl: string) {
  return [...PROMPTS_KEY_BASE, baseUrl] as const
}

export interface UsePromptsQueryOptions {
  enabled?: boolean
  staleTimeMs?: number
  refetchOnMount?: boolean | 'always'
  refetchOnWindowFocus?: boolean
}

export function normalizePromptItem(item: any): PromptItem {
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
    template_id: item.template_id ?? null,
    template_version: item.template_version ?? null,
  } satisfies PromptItem
}

export function normalizeTemplateItem(item: any): PipelineTemplate {
  const steps = Array.isArray(item.steps) ? item.steps : []
  return {
    id: String(item.id),
    name: typeof item.name === 'string' ? item.name : 'template',
    description: typeof item.description === 'string' ? item.description : '',
    steps,
    version: Number(item.version ?? 1),
    is_default: Boolean(item.is_default ?? false),
    created_at: item.created_at ?? new Date().toISOString(),
    updated_at: item.updated_at ?? item.created_at ?? new Date().toISOString(),
  } satisfies PipelineTemplate
}

export function normalizeProjectItem(item: any): NightWorkerProject {
  const status = item.status === 'archived' || item.status === 'paused' ? item.status : 'active'
  return {
    id: item.id,
    name: item.name ?? 'sem-nome',
    description: item.description ?? null,
    default_target_folder: item.default_target_folder ?? null,
    status,
    sla_timeout_seconds: Number(item.sla_timeout_seconds ?? 300),
    sla_max_retries: Number(item.sla_max_retries ?? 3),
    sla_retry_delay_seconds: Number(item.sla_retry_delay_seconds ?? 60),
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
