import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useCreatePromptMutation } from './usePromptMutations'
import type { PipelineConfig, PipelineTemplate } from '@/types/night-worker'

const PROMPT_NAME_MAX_LENGTH = 500

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function isUuid(value?: string | null): boolean {
  if (!value) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

export interface RunPipelineOptions {
  template: PipelineTemplate
  content: string
  targetFolder: string
  projectId?: string | null
  projectName?: string | null
}

export function useCreatePipeline() {
  const navigate = useNavigate()
  const createPrompt = useCreatePromptMutation()

  const runPipeline = useCallback(
    async ({ template, content, targetFolder, projectId, projectName }: RunPipelineOptions) => {
      if (!template || template.steps.length === 0) {
        toast.error('Template invalido ou sem passos')
        return
      }

      const pipelineId = crypto.randomUUID()
      const firstStep = template.steps[0]
      const pipelineConfig: PipelineConfig = {
        template_version: template.version ?? 1,
        steps: template.steps,
        original_input: content,
        ...(template.context_mode ? { context_mode: template.context_mode } : {}),
      }

      const renderedContent = firstStep.instruction
        .split('{input}')
        .join(content)
        .split('{previous_result}')
        .join('')

      const templateId = isUuid(template.id) ? template.id : null
      const namePrefix = projectName ? `${projectName}-${template.name}` : template.name
      const promptName =
        slug(`${namePrefix}-step1-${firstStep.role}`).slice(0, PROMPT_NAME_MAX_LENGTH) ||
        `pipeline-step1-${firstStep.provider}`

      const res = await createPrompt.mutateAsync({
        provider: firstStep.provider,
        name: promptName,
        content: renderedContent,
        target_folder: targetFolder,
        queue_stage: 'prioritized',
        project_id: projectId?.trim() ? projectId : null,
        template_id: templateId,
        template_version: templateId ? (template.version ?? 1) : null,
        pipeline_config: pipelineConfig,
        pipeline_id: pipelineId,
        pipeline_step: 1,
        pipeline_total_steps: template.steps.length,
        pipeline_template_name: template.name,
      })

      toast.success('Pipeline iniciado')
      navigate(`/nw/prompts/${res.id}`)
    },
    [createPrompt, navigate]
  )

  return { runPipeline, isLoading: createPrompt.isPending }
}

