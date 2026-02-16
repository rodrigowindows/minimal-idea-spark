import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/night-worker/StatusBadge'
import { ProviderBadge } from '@/components/night-worker/ProviderBadge'
import { PipelineProgress } from '@/components/night-worker/PipelineProgress'
import { RetryConfirmDialog } from '@/components/night-worker/RetryConfirmDialog'
import type { PipelineStepView } from '@/components/night-worker/PipelineProgress'
import { useProjectPromptsQuery, useProjectsQuery, useReprocessPromptMutation } from '@/hooks/useNightWorkerApi'
import type { PromptItem } from '@/types/night-worker'
import { toast } from 'sonner'
import { ArrowLeft, Briefcase, FolderOpen, Loader2 } from 'lucide-react'

type StatusFilter = 'all' | 'active' | 'completed' | 'failed'

function deriveOverallStatus(items: PromptItem[]): string {
  if (items.some((i) => i.status === 'failed')) return 'failed'
  if (items.some((i) => i.status === 'processing')) return 'processing'
  if (items.some((i) => i.status === 'pending')) return 'pending'
  if (items.every((i) => i.status === 'done')) return 'done'
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

  const { data: allProjects = [] } = useProjectsQuery('all')
  const project = useMemo(() => allProjects.find((p) => p.id === id), [allProjects, id])
  const { data: prompts = [], isLoading: loadingPrompts } = useProjectPromptsQuery(id ?? null, 200)
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

    return {
      pipelineGroups: Array.from(pipelineMap.entries())
        .map(([pipelineId, items]) => ({
          pipelineId,
          templateName: items[0]?.pipeline_template_name ?? 'Pipeline',
          items: items.sort((a, b) => (a.pipeline_step ?? 0) - (b.pipeline_step ?? 0)),
          overallStatus: deriveOverallStatus(items),
          updatedAt: items.reduce((latest, i) => {
            const t = new Date(i.updated_at || i.created_at || '0').getTime()
            return t > latest ? t : latest
          }, 0),
        }))
        .sort((a, b) => b.updatedAt - a.updatedAt),
      standalonePrompts: standalone.sort(
        (a, b) => new Date(b.updated_at || b.created_at || '0').getTime() - new Date(a.updated_at || a.created_at || '0').getTime()
      ),
    }
  }, [prompts])

  const filteredPipelines = useMemo(() => {
    if (statusFilter === 'all') return pipelineGroups
    if (statusFilter === 'active') return pipelineGroups.filter((g) => g.overallStatus === 'pending' || g.overallStatus === 'processing')
    if (statusFilter === 'completed') return pipelineGroups.filter((g) => g.overallStatus === 'done')
    if (statusFilter === 'failed') return pipelineGroups.filter((g) => g.overallStatus === 'failed')
    return pipelineGroups
  }, [pipelineGroups, statusFilter])

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
      }
    )
  }

  const filterButtons: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'active', label: 'Ativos' },
    { value: 'completed', label: 'Concluidos' },
    { value: 'failed', label: 'Falhas' },
  ]

  if (!id) return null

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

      {project?.stats && (
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: 'Total', value: project.stats.total, color: 'border-border/60' },
            { label: 'Pendente', value: project.stats.pending, color: 'border-amber-500/40 bg-amber-500/5' },
            { label: 'Processando', value: project.stats.processing, color: 'border-blue-500/40 bg-blue-500/5' },
            { label: 'Concluido', value: project.stats.done, color: 'border-emerald-500/40 bg-emerald-500/5' },
            { label: 'Falha', value: project.stats.failed, color: 'border-red-500/40 bg-red-500/5' },
          ].map((stat) => (
            <div key={stat.label} className={`rounded-xl border p-3 text-center ${stat.color}`}>
              <p className="text-2xl font-bold text-foreground">{stat.value ?? 0}</p>
              <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Briefcase className="h-5 w-5" /> Pipelines
          </h2>
          <div className="flex gap-1">
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

        {loadingPrompts && (
          <div className="flex min-h-[20vh] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {!loadingPrompts && filteredPipelines.length === 0 && (
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
                    status={group.overallStatus as any}
                    pulse={group.overallStatus === 'processing' || group.overallStatus === 'pending'}
                  />
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {group.pipelineId.slice(0, 8)}...
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <PipelineProgress
                pipelineId={group.pipelineId}
                currentPrompt={group.items[0]}
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
