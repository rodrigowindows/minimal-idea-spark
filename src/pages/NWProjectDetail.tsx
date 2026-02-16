import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ProviderBadge } from '@/components/night-worker/ProviderBadge'
import { PipelineProgress } from '@/components/night-worker/PipelineProgress'
import { RetryConfirmDialog } from '@/components/night-worker/RetryConfirmDialog'
import { StatusBadge } from '@/components/night-worker/StatusBadge'
import type { PipelineStepView } from '@/components/night-worker/PipelineProgress'
import { useProjectPromptsQuery, useProjectsQuery, useReprocessPromptMutation } from '@/hooks/useNightWorkerApi'
import type { PromptItem, PromptStatus } from '@/types/night-worker'
import { toast } from 'sonner'
import { ArrowLeft, Briefcase, FolderOpen, Loader2 } from 'lucide-react'

type StatusFilter = 'all' | 'active' | 'completed' | 'failed'

interface PipelineGroup {
  pipelineId: string
  templateName: string
  items: PromptItem[]
  representativePrompt: PromptItem
  overallStatus: PromptStatus
  updatedAt: number
}

function toTs(value?: string | null): number {
  if (!value) return 0
  const ts = new Date(value).getTime()
  return Number.isNaN(ts) ? 0 : ts
}

function statusScore(status: PromptStatus): number {
  if (status === 'processing') return 4
  if (status === 'pending') return 3
  if (status === 'done') return 2
  return 1
}

function pickCurrentPromptForStep(items: PromptItem[], step: number): PromptItem | null {
  const candidates = items.filter((item) => Number(item.pipeline_step) === step)
  if (candidates.length === 0) return null
  return candidates
    .slice()
    .sort((a, b) => {
      const delta = statusScore(b.status) - statusScore(a.status)
      if (delta !== 0) return delta
      return toTs(b.updated_at || b.created_at) - toTs(a.updated_at || a.created_at)
    })[0]
}

function inferTotalSteps(items: PromptItem[]): number {
  const byTotal = Math.max(...items.map((item) => Number(item.pipeline_total_steps) || 0), 0)
  const byConfig = Math.max(
    ...items.map((item) => (Array.isArray(item.pipeline_config?.steps) ? item.pipeline_config?.steps?.length ?? 0 : 0)),
    0,
  )
  const byStep = Math.max(...items.map((item) => Number(item.pipeline_step) || 0), 0)
  return Math.max(byTotal, byConfig, byStep)
}

function deriveOverallStatus(items: PromptItem[]): PromptStatus {
  const totalSteps = inferTotalSteps(items)
  if (totalSteps < 1) return 'pending'

  const statuses: PromptStatus[] = []

  for (let step = 1; step <= totalSteps; step += 1) {
    const current = pickCurrentPromptForStep(items, step)
    if (!current) {
      statuses.push('pending')
      continue
    }
    statuses.push(current.status)
  }

  if (statuses.some((status) => status === 'processing')) return 'processing'
  if (statuses.some((status) => status === 'failed')) return 'failed'
  if (statuses.some((status) => status === 'pending')) return 'pending'
  if (statuses.every((status) => status === 'done')) return 'done'
  return 'pending'
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString()
}

export default function NWProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [retryTarget, setRetryTarget] = useState<{ promptId: string; stepView: PipelineStepView } | null>(null)

  const { data: allProjects = [], isLoading: loadingProjects } = useProjectsQuery('all')
  const project = useMemo(() => allProjects.find((entry) => entry.id === id), [allProjects, id])
  const { data: prompts = [], isLoading: loadingPrompts } = useProjectPromptsQuery(id ?? null, 500)
  const reprocessMutation = useReprocessPromptMutation()

  const { pipelineGroups, standalonePrompts } = useMemo(() => {
    const pipelineMap = new Map<string, PromptItem[]>()
    const standalone: PromptItem[] = []

    for (const prompt of prompts) {
      if (prompt.pipeline_id) {
        const group = pipelineMap.get(prompt.pipeline_id) ?? []
        group.push(prompt)
        pipelineMap.set(prompt.pipeline_id, group)
      } else {
        standalone.push(prompt)
      }
    }

    const groups: PipelineGroup[] = Array.from(pipelineMap.entries()).map(([pipelineId, items]) => {
      const sortedByStep = items.slice().sort((a, b) => (a.pipeline_step ?? 0) - (b.pipeline_step ?? 0))
      const representativePrompt =
        sortedByStep
          .slice()
          .sort((a, b) => toTs(b.updated_at || b.created_at) - toTs(a.updated_at || a.created_at))[0] ??
        sortedByStep[0]

      return {
        pipelineId,
        templateName: representativePrompt?.pipeline_template_name ?? 'Pipeline',
        items: sortedByStep,
        representativePrompt,
        overallStatus: deriveOverallStatus(items),
        updatedAt: toTs(representativePrompt?.updated_at || representativePrompt?.created_at),
      }
    })

    return {
      pipelineGroups: groups.sort((a, b) => b.updatedAt - a.updatedAt),
      standalonePrompts: standalone.sort(
        (a, b) => toTs(b.updated_at || b.created_at) - toTs(a.updated_at || a.created_at),
      ),
    }
  }, [prompts])

  const filteredPipelines = useMemo(() => {
    if (statusFilter === 'all') return pipelineGroups
    if (statusFilter === 'active') {
      return pipelineGroups.filter((group) => group.overallStatus === 'pending' || group.overallStatus === 'processing')
    }
    if (statusFilter === 'completed') return pipelineGroups.filter((group) => group.overallStatus === 'done')
    if (statusFilter === 'failed') return pipelineGroups.filter((group) => group.overallStatus === 'failed')
    return pipelineGroups
  }, [pipelineGroups, statusFilter])

  const summary = useMemo(() => {
    const totals = project?.stats ?? {
      total: prompts.length,
      pending: prompts.filter((prompt) => prompt.status === 'pending').length,
      processing: prompts.filter((prompt) => prompt.status === 'processing').length,
      done: prompts.filter((prompt) => prompt.status === 'done').length,
      failed: prompts.filter((prompt) => prompt.status === 'failed').length,
    }

    return {
      ...totals,
      pipelines: pipelineGroups.length,
      pipelinesActive: pipelineGroups.filter((group) => group.overallStatus === 'pending' || group.overallStatus === 'processing').length,
      pipelinesDone: pipelineGroups.filter((group) => group.overallStatus === 'done').length,
      pipelinesFailed: pipelineGroups.filter((group) => group.overallStatus === 'failed').length,
    }
  }, [project?.stats, prompts, pipelineGroups])

  const handleRetryStep = (promptId: string, stepView: PipelineStepView) => {
    setRetryTarget({ promptId, stepView })
  }

  const confirmRetry = () => {
    if (!retryTarget) return
    reprocessMutation.mutate(
      { id: retryTarget.promptId },
      {
        onSuccess: (res) => {
          toast.success('Passo reprocessado')
          setRetryTarget(null)
          if (res?.id) navigate(`/nw/prompts/${res.id}`)
        },
        onError: () => {
          toast.error('Falha ao reprocessar passo')
        },
      },
    )
  }

  const filterButtons: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'active', label: 'Ativos' },
    { value: 'completed', label: 'Concluidos' },
    { value: 'failed', label: 'Falhas' },
  ]

  if (!id) return null

  if (!loadingProjects && !project) {
    return (
      <div className="space-y-6 px-4 pb-10 md:px-8">
        <Button variant="ghost" size="icon" onClick={() => navigate('/nw/projects')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-100">
          <AlertTitle>Projeto nao encontrado</AlertTitle>
          <AlertDescription>O projeto informado nao existe ou nao esta acessivel.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6 px-4 pb-10 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/nw/projects')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <p className="text-xs uppercase tracking-[0.1em] text-blue-200">Projeto</p>
            <h1 className="text-3xl font-bold text-foreground">{project?.name || '...'}</h1>
            {project?.description && <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>}
            <div className="mt-2 flex items-center gap-2">
              {project?.status === 'paused' ? (
                <Badge className="border-amber-500/50 bg-amber-500/20 text-amber-100" variant="outline">
                  Pausado
                </Badge>
              ) : (
                <Badge className="border-emerald-500/50 bg-emerald-500/20 text-emerald-100" variant="outline">
                  Ativo
                </Badge>
              )}
              {project?.default_target_folder && (
                <Badge variant="outline" className="gap-1 font-mono text-xs">
                  <FolderOpen className="h-3 w-3" /> {project.default_target_folder}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">
        {[
          { label: 'Total', value: summary.total, color: 'border-border/60' },
          { label: 'Pendente', value: summary.pending, color: 'border-amber-500/40 bg-amber-500/5' },
          { label: 'Processando', value: summary.processing, color: 'border-blue-500/40 bg-blue-500/5' },
          { label: 'Concluido', value: summary.done, color: 'border-emerald-500/40 bg-emerald-500/5' },
          { label: 'Falha', value: summary.failed, color: 'border-red-500/40 bg-red-500/5' },
          { label: 'Pipelines', value: summary.pipelines, color: 'border-border/60' },
          { label: 'Pipe ativos', value: summary.pipelinesActive, color: 'border-blue-500/40 bg-blue-500/5' },
          { label: 'Pipe done', value: summary.pipelinesDone, color: 'border-emerald-500/40 bg-emerald-500/5' },
          { label: 'Pipe falha', value: summary.pipelinesFailed, color: 'border-red-500/40 bg-red-500/5' },
        ].map((stat) => (
          <div key={stat.label} className={`rounded-xl border p-3 text-center ${stat.color}`}>
            <p className="text-2xl font-bold text-foreground">{stat.value ?? 0}</p>
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Briefcase className="h-5 w-5" /> Pipelines
          </h2>
          <div className="flex flex-wrap gap-1">
            {filterButtons.map((btn) => (
              <Button
                key={btn.value}
                size="sm"
                variant={statusFilter === btn.value ? 'default' : 'outline'}
                onClick={() => setStatusFilter(btn.value)}
                className="text-xs"
              >
                {btn.label}
                {btn.value === 'all' && ` (${pipelineGroups.length})`}
              </Button>
            ))}
          </div>
        </div>

        {(loadingProjects || loadingPrompts) && (
          <div className="flex min-h-[20vh] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {!loadingProjects && !loadingPrompts && filteredPipelines.length === 0 && (
          <Card className="border border-border/60 bg-background/40">
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum pipeline encontrado{statusFilter !== 'all' ? ' para este filtro' : ''}.
            </CardContent>
          </Card>
        )}

        {filteredPipelines.map((group) => (
          <Card key={group.pipelineId} className="border border-white/10 bg-card/70 backdrop-blur">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">{group.templateName}</CardTitle>
                <div className="flex items-center gap-2">
                  <StatusBadge
                    status={group.overallStatus}
                    pulse={group.overallStatus === 'processing' || group.overallStatus === 'pending'}
                  />
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {group.pipelineId.slice(0, 8)}...
                  </Badge>
                </div>
              </div>
              <CardDescription className="text-xs">Atualizado: {formatDate(group.representativePrompt.updated_at || group.representativePrompt.created_at)}</CardDescription>
            </CardHeader>
            <CardContent>
              <PipelineProgress
                pipelineId={group.pipelineId}
                currentPrompt={group.representativePrompt}
                prompts={group.items}
                onRetryStep={handleRetryStep}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {standalonePrompts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Prompts avulsos</h2>
          {standalonePrompts.map((prompt) => (
            <button
              key={prompt.id}
              type="button"
              onClick={() => navigate(`/nw/prompts/${prompt.id}`)}
              className="w-full rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-left hover:border-blue-400/40"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <StatusBadge status={prompt.status} pulse={prompt.status === 'pending' || prompt.status === 'processing'} />
                  <span className="font-medium text-sm">{prompt.name}</span>
                </div>
                <ProviderBadge provider={prompt.provider} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Atualizado: {formatDate(prompt.updated_at || prompt.created_at)}</p>
            </button>
          ))}
        </div>
      )}

      <RetryConfirmDialog
        open={!!retryTarget}
        onOpenChange={(open) => {
          if (!open) setRetryTarget(null)
        }}
        stepInfo={retryTarget?.stepView}
        isRetrying={reprocessMutation.isPending}
        onConfirm={confirmRetry}
      />
    </div>
  )
}
