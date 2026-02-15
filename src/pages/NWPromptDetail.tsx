import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/night-worker/StatusBadge'
import { ProviderBadge } from '@/components/night-worker/ProviderBadge'
import { useEditPromptMutation, usePipelinePromptsQuery, usePromptStatusQuery, useReprocessPromptMutation } from '@/hooks/useNightWorkerApi'
import { useNightWorker } from '@/contexts/NightWorkerContext'
import { toast } from 'sonner'
import { ArrowLeft, CheckCircle2, Circle, Copy, ExternalLink, Loader2, Pencil, RefreshCw, Save, Send, XCircle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { PipelineStep, PromptItem } from '@/types/night-worker'

export default function NWPromptDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isConnected, config } = useNightWorker()
  const isEdgeBackend = config.baseUrl.includes('supabase.co')
  const { data, isLoading, isError, error, refetch, isFetching } = usePromptStatusQuery(id)
  const editMutation = useEditPromptMutation()
  const reprocessMutation = useReprocessPromptMutation()

  const [isEditing, setIsEditing] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [draftContent, setDraftContent] = useState('')
  const [draftTargetFolder, setDraftTargetFolder] = useState('')

  useEffect(() => {
    if (data) {
      setDraftName(data.name || '')
      setDraftContent(data.content || '')
      setDraftTargetFolder(data.target_folder || '')
      setIsEditing(false)
    }
  }, [data])

  const canEdit = data?.status === 'pending'
  const canReprocess = data?.status === 'done' || data?.status === 'failed'
  const pipelineId = data?.pipeline_id ?? null
  const pipelineQuery = usePipelinePromptsQuery(pipelineId)

  const pipelineView = useMemo(() => {
    if (!data?.pipeline_id || !data.pipeline_step || !data.pipeline_total_steps) return null

    const list = pipelineQuery.data ?? []
    const configSteps = Array.isArray(data.pipeline_config?.steps) ? data.pipeline_config.steps : []
    const totalSteps = Number(data.pipeline_total_steps) || configSteps.length || 0
    if (totalSteps < 1) return null

    const pickPromptForStep = (step: number): PromptItem | null => {
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
          const aTime = new Date(a.updated_at || a.created_at || 0).getTime()
          const bTime = new Date(b.updated_at || b.created_at || 0).getTime()
          return bTime - aTime
        })[0]
    }

    const steps = Array.from({ length: totalSteps }).map((_, index) => {
      const stepNum = index + 1
      const mappedPrompt = pickPromptForStep(stepNum)
      const configStep = configSteps[index] as PipelineStep | undefined
      const provider = configStep?.provider ?? mappedPrompt?.provider ?? 'unknown'
      const role = configStep?.role ?? `step-${stepNum}`
      const status = mappedPrompt?.status ?? (stepNum === data.pipeline_step ? data.status : stepNum < data.pipeline_step ? 'done' : 'pending')
      return {
        step: stepNum,
        provider,
        role,
        status,
        promptId: mappedPrompt?.id ?? (stepNum === data.pipeline_step ? data.id : null),
      }
    })

    return {
      templateName: data.pipeline_template_name || 'Pipeline',
      currentStep: data.pipeline_step,
      totalSteps,
      steps,
    }
  }, [data, pipelineQuery.data])

  const handleCopy = (text?: string | null) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    toast.success('Copiado para a area de transferencia')
  }

  const handleSaveEdit = () => {
    if (!id || !canEdit) return
    editMutation.mutate(
      {
        id,
        name: draftName.trim(),
        content: draftContent,
        target_folder: draftTargetFolder.trim() || null,
      },
      {
        onSuccess: () => {
          toast.success('Prompt atualizado')
          setIsEditing(false)
        },
        onError: () => {
          toast.error('Falha ao atualizar prompt')
        },
      }
    )
  }

  const handleReprocess = () => {
    if (!id || !canReprocess) return
    reprocessMutation.mutate(
      { id },
      {
        onSuccess: (res) => {
          toast.success('Prompt reprocessado')
          if (res?.id) navigate(`/nw/prompts/${res.id}`)
        },
        onError: () => {
          toast.error('Falha ao reprocessar')
        },
      }
    )
  }

  if (!id) return null

  return (
    <div className="px-4 pb-10 md:px-8">
      {!isConnected && (
        <Alert className="mb-4 border-amber-500/40 bg-amber-500/10 text-amber-100">
          <AlertTitle>Configure a conexao</AlertTitle>
          <AlertDescription>
            Defina a URL/token em <button className="underline" onClick={() => navigate('/nw/connect')}>/connect</button> para ver os detalhes.
          </AlertDescription>
        </Alert>
      )}

      {isError && (
        <Alert className="mb-4 border-red-500/40 bg-red-500/10 text-red-100">
          <AlertTitle>Erro ao carregar prompt</AlertTitle>
          <AlertDescription className="space-y-2">
            <div>{error instanceof Error ? error.message : 'Nao foi possivel consultar o prompt.'}</div>
            <Button size="sm" variant="outline" onClick={() => refetch()}>Tentar novamente</Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/nw/prompts')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <p className="text-xs uppercase tracking-[0.1em] text-blue-200">Detalhe do prompt</p>
            <h1 className="text-3xl font-bold text-foreground">{data?.name || '...'}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {data && <StatusBadge status={data.status} pulse={data.status === 'pending' || data.status === 'processing'} />}
              {data && <ProviderBadge provider={data.provider} />}
              {data?.cloned_from && <Badge variant="outline">Reprocessado</Badge>}
              <Badge variant="outline" className="font-mono text-xs">ID: {id}</Badge>
            </div>
          </div>
        </div>
        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {pipelineView && (
        <Card className="mb-4 border border-blue-500/30 bg-blue-500/5">
          <CardHeader>
            <CardTitle className="text-base">
              Pipeline: {pipelineView.templateName} (Passo {pipelineView.currentStep}/{pipelineView.totalSteps})
            </CardTitle>
            <CardDescription>
              {pipelineQuery.isFetching ? 'Atualizando progresso...' : 'Fluxo multi-step deste prompt'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {pipelineView.steps.map((step, index) => (
                <div key={`pipeline-step-${step.step}`} className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!step.promptId}
                    onClick={() => step.promptId && navigate(`/nw/prompts/${step.promptId}`)}
                    className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition ${
                      step.status === 'done'
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
                        : step.status === 'processing'
                          ? 'border-blue-500/50 bg-blue-500/10 text-blue-200'
                          : step.status === 'failed'
                            ? 'border-red-500/50 bg-red-500/10 text-red-200'
                            : 'border-border/60 bg-background/40 text-muted-foreground'
                    } ${step.promptId ? 'hover:border-blue-400/60 hover:text-foreground' : 'cursor-default'}`}
                  >
                    <StepStatusIcon status={step.status} />
                    <span>
                      {step.step}. {step.provider} {step.role}
                    </span>
                  </button>
                  {index < pipelineView.steps.length - 1 && <span className="text-muted-foreground">-&gt;</span>}
                </div>
              ))}
            </div>
            {pipelineQuery.isError && (
              <p className="text-xs text-amber-300">Nao foi possivel carregar todos os passos do pipeline agora.</p>
            )}
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && data && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border border-white/10 bg-card/70 backdrop-blur">
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle>Prompt Enviado</CardTitle>
                  <CardDescription>Conteudo original</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleCopy(isEditing ? draftContent : data.content)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  {canEdit && !isEditing && (
                    <Button variant="outline" size="icon" onClick={() => setIsEditing(true)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <div className="space-y-3 rounded-xl border border-border/60 bg-background/50 p-4">
                    <Input value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder="Nome do prompt" />
                    <Input value={draftTargetFolder} onChange={(e) => setDraftTargetFolder(e.target.value)} placeholder="Pasta alvo" />
                    <Textarea
                      rows={14}
                      value={draftContent}
                      onChange={(e) => setDraftContent(e.target.value)}
                      placeholder="Conteudo do prompt"
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleSaveEdit} disabled={editMutation.isPending || !draftName.trim() || !draftContent.trim()}>
                        <Save className="mr-2 h-4 w-4" /> Salvar
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setDraftName(data.name || '')
                          setDraftContent(data.content || '')
                          setDraftTargetFolder(data.target_folder || '')
                          setIsEditing(false)
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border/60 bg-background/50 p-4">
                    <ReactMarkdown className="prose prose-invert max-w-none text-sm leading-relaxed">
                      {data.content || '_Sem conteudo disponivel_'}
                    </ReactMarkdown>
                  </div>
                )}

                <div className="grid gap-3 text-sm md:grid-cols-2">
                  <MetaItem label="Pasta alvo" value={data.target_folder || '-'} />
                  <MetaItem label="Tamanho" value={`${data.content?.length ?? 0} chars`} />
                  <MetaItem label="Provider" value={data.provider} />
                  <MetaItem label="Criado" value={formatDate(data.created_at)} />
                  <MetaItem label="Atualizado" value={formatDate(data.updated_at)} />
                  <MetaItem label="Tentativas" value={data.attempts ?? 0} />
                  <MetaItem label="Proximo retry" value={formatDate(data.next_retry_at)} />
                  <MetaItem label="Stage" value={data.queue_stage || '-'} />
                  <MetaItem label="Prioridade" value={data.priority_order ?? '-'} />
                  <MetaItem label="Pipeline ID" value={data.pipeline_id || '-'} />
                  <MetaItem label="Pipeline passo" value={data.pipeline_step ? `${data.pipeline_step}/${data.pipeline_total_steps ?? '-'}` : '-'} />
                  <MetaItem label="Pipeline template" value={data.pipeline_template_name || '-'} />
                  {data.result_path && <MetaItem label="Arquivo resultado" value={data.result_path} />}
                </div>
                {data.cloned_from && (
                  <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-emerald-400">Reprocessado de</p>
                    <button
                      className="font-mono text-sm font-semibold text-emerald-300 underline hover:text-emerald-200"
                      onClick={() => navigate(`/nw/prompts/${data.cloned_from}`)}
                    >
                      {data.cloned_from}
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border border-white/10 bg-card/70 backdrop-blur">
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle>Resultado</CardTitle>
                  <CardDescription>
                    {data.status === 'pending' && 'Aguardando processamento...'}
                    {data.status === 'processing' && 'Processando no worker...'}
                    {data.status === 'done' && 'Conteudo renderizado'}
                    {data.status === 'failed' && 'Falhou - veja detalhes abaixo'}
                  </CardDescription>
                </div>
                {data.status === 'done' && (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleCopy(data.result_content)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    {data.result_path && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => window.open(`file://${data.result_path}`, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {(data.status === 'pending' || data.status === 'processing') && (
                  <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/60 bg-background/40 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <p>{data.status === 'processing' ? 'Processando no worker...' : 'Aguardando processamento...'}</p>
                    {isEdgeBackend ? (
                      <p className="max-w-md px-4 text-center text-xs text-muted-foreground/90">
                        Processado pelo worker (worker.py em modo Supabase). Se estiver parado, confira se o worker esta rodando.
                      </p>
                    ) : (
                      <p className="max-w-md px-4 text-center text-xs text-muted-foreground/90">
                        Processado pelo worker (worker.py lendo input/). Confira se o worker esta rodando.
                      </p>
                    )}
                  </div>
                )}

                {data.status === 'failed' && (
                  <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
                    <p className="font-semibold">Erro</p>
                    <p className="mt-2 whitespace-pre-wrap">{data.error || 'Sem detalhes do erro.'}</p>
                    <p className="mt-2 text-xs text-red-200">Tentativas: {data.attempts ?? 0}</p>
                    {data.next_retry_at && <p className="mt-1 text-xs text-red-200">Proximo retry: {formatDate(data.next_retry_at)}</p>}
                  </div>
                )}

                {data.status === 'done' && (
                  <div className="space-y-2">
                    <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-4">
                      <ReactMarkdown className="prose prose-invert max-w-none text-sm leading-relaxed">
                        {data.result_content || '_Sem conteudo retornado_'}
                      </ReactMarkdown>
                    </div>
                    {data.result_content && (
                      <p className="text-[11px] text-muted-foreground">
                        {data.result_content.length.toLocaleString()} caracteres
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Provider:</span> <ProviderBadge provider={data.provider} />
              <span>Status:</span> <StatusBadge status={data.status} />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => navigate('/nw/prompts')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para lista
              </Button>
              {canReprocess && (
                <Button onClick={handleReprocess} disabled={reprocessMutation.isPending}>
                  <Send className="mr-2 h-4 w-4" /> Reprocessar
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function MetaItem({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/50 p-3">
      <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <p className="font-semibold text-foreground">{value ?? '-'}</p>
    </div>
  )
}

function StepStatusIcon({ status }: { status: string }) {
  if (status === 'done') return <CheckCircle2 className="h-3.5 w-3.5" />
  if (status === 'processing') return <Loader2 className="h-3.5 w-3.5 animate-spin" />
  if (status === 'failed') return <XCircle className="h-3.5 w-3.5" />
  return <Circle className="h-3.5 w-3.5" />
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString()
}
