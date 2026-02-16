import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { usePipelinePromptsQuery } from '@/hooks/useNightWorkerApi'
import type { PipelineStep, PromptItem } from '@/types/night-worker'
import { CheckCircle2, Circle, Loader2, RefreshCw, XCircle } from 'lucide-react'

export interface PipelineStepView {
  step: number
  provider: string
  role: string
  status: string
  promptId: string | null
}

function StepStatusIcon({ status }: { status: string }) {
  if (status === 'done') return <CheckCircle2 className="h-3.5 w-3.5" />
  if (status === 'processing') return <Loader2 className="h-3.5 w-3.5 animate-spin" />
  if (status === 'failed') return <XCircle className="h-3.5 w-3.5" />
  return <Circle className="h-3.5 w-3.5" />
}

function pickPromptForStep(list: PromptItem[], step: number): PromptItem | null {
  const items = list.filter((item) => Number(item.pipeline_step) === step)
  if (items.length === 0) return null
  const score = (status: string) => {
    if (status === 'processing') return 4
    if (status === 'pending') return 3
    if (status === 'done') return 2
    if (status === 'failed') return 1
    return 0
  }
  return items
    .slice()
    .sort((a, b) => {
      const statusDelta = score(b.status) - score(a.status)
      if (statusDelta !== 0) return statusDelta
      const aTime = new Date(a.updated_at || a.created_at || '0').getTime()
      const bTime = new Date(b.updated_at || b.created_at || '0').getTime()
      return bTime - aTime
    })[0]
}

interface PipelineProgressProps {
  pipelineId: string
  /** Fallback data from current prompt when pipeline query hasn't loaded */
  currentPrompt?: PromptItem | null
  /** Pre-fetched prompts to avoid N+1 queries in lists */
  prompts?: PromptItem[]
  /** Compact mode for embedding in lists */
  compact?: boolean
  /** Called when user clicks retry on a failed step */
  onRetryStep?: (promptId: string, stepView: PipelineStepView) => void
}

export function PipelineProgress({
  pipelineId,
  currentPrompt,
  prompts: externalPrompts,
  compact,
  onRetryStep,
}: PipelineProgressProps) {
  const navigate = useNavigate()
  const skipFetch = !!externalPrompts
  const pipelineQuery = usePipelinePromptsQuery(skipFetch ? null : pipelineId)
  const promptList = externalPrompts ?? pipelineQuery.data ?? []

  const steps = useMemo(() => {
    const data = currentPrompt
    if (!data?.pipeline_step && !data?.pipeline_total_steps && promptList.length === 0) return []

    const configSteps = Array.isArray(data?.pipeline_config?.steps) ? data.pipeline_config.steps : []
    const totalSteps =
      Number(data?.pipeline_total_steps) ||
      configSteps.length ||
      Math.max(...promptList.map((p) => Number(p.pipeline_step) || 0), 0)
    if (totalSteps < 1) return []

    return Array.from({ length: totalSteps }).map((_, index) => {
      const stepNum = index + 1
      const mappedPrompt = pickPromptForStep(promptList, stepNum)
      const configStep = configSteps[index] as PipelineStep | undefined
      const provider = configStep?.provider ?? mappedPrompt?.provider ?? 'unknown'
      const role = configStep?.role ?? `step-${stepNum}`
      const status =
        mappedPrompt?.status ??
        (data && stepNum === data.pipeline_step
          ? data.status
          : data && stepNum < (data.pipeline_step ?? 0)
            ? 'done'
            : 'pending')
      return {
        step: stepNum,
        provider,
        role,
        status,
        promptId: mappedPrompt?.id ?? (data && stepNum === data.pipeline_step ? data.id : null),
      } satisfies PipelineStepView
    })
  }, [currentPrompt, promptList])

  if (steps.length === 0) return null

  return (
    <div className="space-y-2">
      <div className={`flex flex-wrap items-center ${compact ? 'gap-1.5' : 'gap-2'}`}>
        {steps.map((step, index) => (
          <div key={`ps-${step.step}`} className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={!step.promptId}
              onClick={() => step.promptId && navigate(`/nw/prompts/${step.promptId}`)}
              className={`flex items-center gap-1.5 rounded-full border transition ${
                compact ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
              } ${
                step.status === 'done'
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
                  : step.status === 'processing'
                    ? 'border-blue-500/50 bg-blue-500/10 text-blue-200 animate-pulse'
                    : step.status === 'failed'
                      ? 'border-red-500/50 bg-red-500/10 text-red-200'
                      : 'border-border/60 bg-background/40 text-muted-foreground'
              } ${step.promptId ? 'hover:border-blue-400/60 hover:text-foreground cursor-pointer' : 'cursor-default'}`}
            >
              <StepStatusIcon status={step.status} />
              <span>
                {step.step}. {step.provider} {step.role}
              </span>
            </button>
            {!compact && step.status === 'failed' && step.promptId && onRetryStep && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 px-2 text-[11px] border-red-500/30 text-red-300 hover:bg-red-500/20"
                onClick={(e) => {
                  e.stopPropagation()
                  onRetryStep(step.promptId!, step)
                }}
              >
                <RefreshCw className="h-3 w-3" /> Retentar
              </Button>
            )}
            {index < steps.length - 1 && (
              <span className={`text-muted-foreground ${compact ? 'text-[10px]' : ''}`}>
                {'\u2192'}
              </span>
            )}
          </div>
        ))}
      </div>
      {!skipFetch && pipelineQuery.isError && (
        <p className="text-xs text-amber-300">Nao foi possivel carregar todos os passos do pipeline agora.</p>
      )}
    </div>
  )
}
