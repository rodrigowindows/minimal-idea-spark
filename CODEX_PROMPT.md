# Codex Task: 5 Frontend Improvements for Night Worker

You are working on the React frontend at `C:\code\minimal-idea-spark`. This is a Night Worker dashboard built with React, TypeScript, TanStack React Query, Tailwind CSS, shadcn/ui, react-router-dom v6, react-hook-form, Zod, Sonner (toasts), and Lucide icons.

The UI uses a dark theme with glassmorphism (`border border-white/10 bg-card/70 backdrop-blur`). Portuguese language for user-facing strings.

## TASK OVERVIEW

Implement these 5 improvements in order:

1. **useCreatePipeline hook** - Extract duplicated pipeline creation logic
2. **PipelineProgress component** - Reusable pipeline step visualization
3. **RetryConfirmDialog component** - Confirmation dialog for pipeline retry
4. **NWProjectDetail page** - New page at `/nw/projects/:id`
5. **Template Sync** - Ensure default templates persist in database

---

## TASK 1: Create `src/hooks/night-worker/useCreatePipeline.ts`

This hook extracts logic duplicated between `src/pages/NWProjects.tsx` (lines 190-231) and `src/pages/NWRunTemplate.tsx` (lines 66-108).

Create this exact file:

```typescript
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
        template_version: 1,
        steps: template.steps,
        original_input: content,
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
```

Then add this export to `src/hooks/night-worker/index.ts`:
```typescript
export { useCreatePipeline } from './useCreatePipeline'
```

Add it after the last existing export line.

---

## TASK 2: Refactor `src/pages/NWProjects.tsx`

Changes:
1. **Remove** the `slug()` function (lines 41-48)
2. **Remove** the `isUuid()` function (lines 56-59)
3. **Remove** `useCreatePromptMutation` from the imports on line 19 and line 83
4. **Remove** `PipelineConfig` from the type import on line 25
5. **Add** import: `import { useCreatePipeline } from '@/hooks/useNightWorkerApi'`
6. **Replace** `const createPrompt = useCreatePromptMutation()` (line 83) with: `const { runPipeline, isLoading: pipelineLoading } = useCreatePipeline()`
7. **Replace** the entire `onRun` function (lines 174-231) with:

```typescript
  const onRun = async (values: RunValues) => {
    if (!selectedProject) {
      toast.error(t('projects.toast.selectProject'))
      return
    }
    if (selectedProject.status === 'paused') {
      toast.error(t('projects.pausedMessage'))
      return
    }
    const template = templates.find((entry) => entry.id === values.template_id)
    if (!template || template.steps.length === 0) {
      toast.error(t('projects.toast.invalidTemplate'))
      return
    }
    try {
      await runPipeline({
        template,
        content: values.content,
        targetFolder: values.target_folder,
        projectId: selectedProject.id,
        projectName: selectedProject.name,
      })
      toast.success(t('projects.toast.processStarted'))
    } catch {
      toast.error(t('projects.toast.processFailed'))
    }
  }
```

8. **Replace** the submit button (line 482): change `createPrompt.isPending` to `pipelineLoading`
9. **Replace** the button text (lines 483-491): change `createPrompt.isPending` to `pipelineLoading`
10. **Add** a "Ver detalhes" button inside each project card. In the project list `div` (around line 376), add this button next to the pause/resume button:

```tsx
<Button
  type="button"
  size="sm"
  variant="ghost"
  onClick={(event) => {
    event.stopPropagation()
    navigate(`/nw/projects/${project.id}`)
  }}
>
  <ArrowRight className="h-3 w-3" />
</Button>
```

Keep `formatDate()` function - it's still used for prompt listing.

---

## TASK 3: Refactor `src/pages/NWRunTemplate.tsx`

Changes:
1. **Remove** the `slug()` function (lines 27-34)
2. **Remove** the `isUuid()` function (lines 36-39)
3. **Remove** `useCreatePromptMutation` from imports (line 14) and `PipelineConfig` from type imports (line 15)
4. **Add** import: `import { useCreatePipeline } from '@/hooks/useNightWorkerApi'`
5. **Replace** `const createPrompt = useCreatePromptMutation()` (line 44) with: `const { runPipeline, isLoading: pipelineLoading } = useCreatePipeline()`
6. **Replace** the entire `onSubmit` function (lines 66-108) with:

```typescript
  const onSubmit = async (values: FormValues) => {
    if (!template || template.steps.length === 0) return
    try {
      await runPipeline({
        template,
        content: values.content,
        targetFolder: values.target_folder,
        projectId: values.project_id,
      })
    } catch {
      toast.error('Falha ao iniciar pipeline')
    }
  }
```

7. **Replace** `createPrompt.isPending` with `pipelineLoading` in the submit button (line 207) and button text (lines 208-216)

---

## TASK 4: Create `src/components/night-worker/PipelineProgress.tsx`

```typescript
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ProviderBadge } from './ProviderBadge'
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
```

---

## TASK 5: Create `src/components/night-worker/RetryConfirmDialog.tsx`

```typescript
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { PipelineStepView } from './PipelineProgress'

interface RetryConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  stepInfo?: PipelineStepView | null
  isRetrying: boolean
  onConfirm: () => void
}

export function RetryConfirmDialog({ open, onOpenChange, stepInfo, isRetrying, onConfirm }: RetryConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Retentar pipeline deste passo?</AlertDialogTitle>
          <AlertDialogDescription>
            O passo {stepInfo?.step} ({stepInfo?.provider} - {stepInfo?.role}) sera reprocessado.
            Isso criara uma copia do prompt e o colocara na fila de processamento.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRetrying}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isRetrying}>
            {isRetrying ? 'Retentando...' : 'Confirmar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

---

## TASK 6: Refactor `src/pages/NWPromptDetail.tsx`

Replace the entire file with:

```typescript
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/night-worker/StatusBadge'
import { ProviderBadge } from '@/components/night-worker/ProviderBadge'
import { PipelineProgress } from '@/components/night-worker/PipelineProgress'
import { RetryConfirmDialog } from '@/components/night-worker/RetryConfirmDialog'
import type { PipelineStepView } from '@/components/night-worker/PipelineProgress'
import { useEditPromptMutation, usePromptStatusQuery, useReprocessPromptMutation } from '@/hooks/useNightWorkerApi'
import { useNightWorker } from '@/contexts/NightWorkerContext'
import { toast } from 'sonner'
import { ArrowLeft, Copy, ExternalLink, Loader2, Pencil, RefreshCw, Save, Send } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

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
  const [retryTarget, setRetryTarget] = useState<{ promptId: string; stepView: PipelineStepView } | null>(null)

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

  const handleCopy = (text?: string | null) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    toast.success('Copiado para a area de transferencia')
  }

  const handleSaveEdit = () => {
    if (!id || !canEdit) return
    editMutation.mutate(
      { id, name: draftName.trim(), content: draftContent, target_folder: draftTargetFolder.trim() || null },
      {
        onSuccess: () => { toast.success('Prompt atualizado'); setIsEditing(false) },
        onError: () => { toast.error('Falha ao atualizar prompt') },
      }
    )
  }

  const handleReprocess = () => {
    if (!id || !canReprocess) return
    reprocessMutation.mutate(
      { id },
      {
        onSuccess: (res) => { toast.success('Prompt reprocessado'); if (res?.id) navigate(`/nw/prompts/${res.id}`) },
        onError: () => { toast.error('Falha ao reprocessar') },
      }
    )
  }

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
        onError: () => { toast.error('Falha ao reprocessar passo') },
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

      {pipelineId && data && (
        <Card className="mb-4 border border-blue-500/30 bg-blue-500/5">
          <CardHeader>
            <CardTitle className="text-base">
              Pipeline: {data.pipeline_template_name || 'Pipeline'} (Passo {data.pipeline_step}/{data.pipeline_total_steps})
            </CardTitle>
            <CardDescription>Fluxo multi-step deste prompt</CardDescription>
          </CardHeader>
          <CardContent>
            <PipelineProgress
              pipelineId={pipelineId}
              currentPrompt={data}
              onRetryStep={handleRetryStep}
            />
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
                    <Textarea rows={14} value={draftContent} onChange={(e) => setDraftContent(e.target.value)} placeholder="Conteudo do prompt" />
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
                      <Button variant="outline" size="icon" onClick={() => window.open(`file://${data.result_path}`, '_blank')}>
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

      <RetryConfirmDialog
        open={!!retryTarget}
        onOpenChange={(open) => { if (!open) setRetryTarget(null) }}
        stepInfo={retryTarget?.stepView}
        isRetrying={reprocessMutation.isPending}
        onConfirm={confirmRetry}
      />
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

function formatDate(value?: string | null) {
  if (!value) return '-'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString()
}
```

---

## TASK 7: Create `src/pages/NWProjectDetail.tsx`

```typescript
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
        onError: () => { toast.error('Falha ao reprocessar passo') },
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
            {project?.description && (
              <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
            )}
            <div className="mt-2 flex items-center gap-2">
              {project?.status === 'paused' ? (
                <Badge className="border-amber-500/50 bg-amber-500/20 text-amber-100" variant="outline">Pausado</Badge>
              ) : (
                <Badge className="border-emerald-500/50 bg-emerald-500/20 text-emerald-100" variant="outline">Ativo</Badge>
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
        onOpenChange={(open) => { if (!open) setRetryTarget(null) }}
        stepInfo={retryTarget?.stepView}
        isRetrying={reprocessMutation.isPending}
        onConfirm={confirmRetry}
      />
    </div>
  )
}
```

---

## TASK 8: Update `src/App.tsx` routes

1. Add lazy import after line 60 (after NWTestDashboard):
```typescript
const NWProjectDetail = lazy(() => import("@/pages/NWProjectDetail"));
```

2. Add route BEFORE the `/nw/projects` route (before line 195):
```tsx
<Route path="/nw/projects/:id" element={<Suspense fallback={<PageFallback />}><NWProjectDetail /></Suspense>} />
```

3. Add prefetch after line 131 (after NWProjects prefetch):
```typescript
import("@/pages/NWProjectDetail");
```

---

## TASK 9: Template Sync - Update `src/hooks/night-worker/useTemplatesQuery.ts`

Replace the `queryFn` in `useTemplatesQuery` (lines 14-44) with:

```typescript
    queryFn: async () => {
      const fetchTemplates = async () => {
        const raw = await apiFetch<{ templates?: any[] } | any[]>('/templates')
        const items = Array.isArray(raw) ? raw : raw.templates ?? []
        return items.map((item) => normalizeTemplateItem(item))
      }

      try {
        const templates = await fetchTemplates()
        const defaults = getDefaultPipelineTemplates()

        if (templates.length === 0) {
          // No templates at all - create all defaults
          for (const template of defaults) {
            try {
              await apiFetch('/templates', {
                method: 'POST',
                body: JSON.stringify({
                  name: template.name,
                  description: template.description,
                  steps: template.steps,
                  is_default: true,
                }),
              })
            } catch { /* ignore individual failures */ }
          }
          return await fetchTemplates()
        }

        // Templates exist - check if defaults are missing by name
        const existingNames = new Set(templates.map((t) => t.name))
        const missingDefaults = defaults.filter((d) => !existingNames.has(d.name))

        if (missingDefaults.length > 0) {
          for (const template of missingDefaults) {
            try {
              await apiFetch('/templates', {
                method: 'POST',
                body: JSON.stringify({
                  name: template.name,
                  description: template.description,
                  steps: template.steps,
                  is_default: true,
                }),
              })
            } catch { /* ignore individual failures */ }
          }
          return await fetchTemplates()
        }

        return templates
      } catch (error) {
        if (error instanceof ApiError && (error.status === 404 || error.status === 501)) {
          return getDefaultPipelineTemplates()
        }
        throw error
      }
    },
```

---

## TASK 10: Update `src/lib/nightworker/pipelineTemplates.ts`

Add `is_default: true` to each of the 3 default templates. In the `defaultTimestampedTemplate` calls, add the field:

For each template object (there are 3), add `is_default: true` as a property. Example for the first one:

```typescript
    defaultTimestampedTemplate({
      id: 'tpl-quick-validate',
      name: 'Quick Validate',
      description: 'Gemini valida, Claude confere',
      is_default: true,
      steps: [
        // ... existing steps unchanged
      ],
    }),
```

Do the same for `tpl-full-pipeline` and `tpl-deep-review`.

---

## SUMMARY OF ALL FILES

### New files to CREATE:
1. `src/hooks/night-worker/useCreatePipeline.ts`
2. `src/components/night-worker/PipelineProgress.tsx`
3. `src/components/night-worker/RetryConfirmDialog.tsx`
4. `src/pages/NWProjectDetail.tsx`

### Existing files to MODIFY:
5. `src/hooks/night-worker/index.ts` - Add useCreatePipeline export
6. `src/pages/NWProjects.tsx` - Use useCreatePipeline, add project detail link
7. `src/pages/NWRunTemplate.tsx` - Use useCreatePipeline
8. `src/pages/NWPromptDetail.tsx` - Use PipelineProgress + RetryConfirmDialog
9. `src/App.tsx` - Add NWProjectDetail route + prefetch
10. `src/hooks/night-worker/useTemplatesQuery.ts` - Enhanced default sync
11. `src/lib/nightworker/pipelineTemplates.ts` - Add is_default: true

### DO NOT modify any other files.

After all changes, run `npx tsc --noEmit` to verify no TypeScript errors.
