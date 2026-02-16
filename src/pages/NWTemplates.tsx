import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ProviderBadge } from '@/components/night-worker/ProviderBadge'
import { toast } from 'sonner'
import { ArrowDown, ArrowUp, Briefcase, GitBranch, Pencil, Play, Plus, Save, Trash2, X } from 'lucide-react'
import type { NightWorkerProvider, PipelineContextMode, PipelineStep, PipelineTemplate } from '@/types/night-worker'
import {
  useCreateTemplateMutation,
  useDeleteTemplateMutation,
  useTemplatesQuery,
  useUpdateTemplateMutation,
} from '@/hooks/useNightWorkerApi'

interface TemplateDraft {
  id?: string
  name: string
  description: string
  context_mode: PipelineContextMode
  steps: PipelineStep[]
}

const PROVIDERS: NightWorkerProvider[] = ['gemini', 'claude', 'codex']

function createEmptyStep(): PipelineStep {
  return {
    provider: 'gemini',
    role: 'validate',
    instruction: '{input}',
  }
}

function createEmptyDraft(): TemplateDraft {
  return {
    name: '',
    description: '',
    context_mode: 'all_steps',
    steps: [createEmptyStep()],
  }
}

export default function NWTemplates() {
  const navigate = useNavigate()
  const [draft, setDraft] = useState<TemplateDraft | null>(null)
  const templatesQuery = useTemplatesQuery()
  const createTemplate = useCreateTemplateMutation()
  const updateTemplate = useUpdateTemplateMutation()
  const deleteTemplate = useDeleteTemplateMutation()
  const templates = templatesQuery.data ?? []

  const orderedTemplates = useMemo(
    () => templates.slice().sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
    [templates]
  )

  const openCreate = () => {
    setDraft(createEmptyDraft())
  }

  const openEdit = (template: PipelineTemplate) => {
    setDraft({
      id: template.id,
      name: template.name,
      description: template.description,
      context_mode: template.context_mode ?? 'previous_only',
      steps: template.steps.map((s) => ({ ...s })),
    })
  }

  const updateStep = (index: number, patch: Partial<PipelineStep>) => {
    setDraft((prev) => {
      if (!prev) return prev
      const steps = prev.steps.slice()
      steps[index] = { ...steps[index], ...patch }
      return { ...prev, steps }
    })
  }

  const addStep = () => {
    setDraft((prev) => {
      if (!prev) return prev
      return { ...prev, steps: [...prev.steps, createEmptyStep()] }
    })
  }

  const removeStep = (index: number) => {
    setDraft((prev) => {
      if (!prev) return prev
      if (prev.steps.length <= 1) return prev
      return { ...prev, steps: prev.steps.filter((_, i) => i !== index) }
    })
  }

  const moveStep = (index: number, direction: -1 | 1) => {
    setDraft((prev) => {
      if (!prev) return prev
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= prev.steps.length) return prev
      const steps = prev.steps.slice()
      const current = steps[index]
      steps[index] = steps[nextIndex]
      steps[nextIndex] = current
      return { ...prev, steps }
    })
  }

  const saveDraft = () => {
    if (!draft) return

    const name = draft.name.trim()
    if (name.length < 3) {
      toast.error('Nome precisa ter pelo menos 3 caracteres')
      return
    }

    const steps = draft.steps.map((s) => ({
      provider: s.provider,
      role: s.role.trim(),
      instruction: s.instruction,
    }))

    if (steps.some((s) => !s.provider || !s.role || !s.instruction.trim())) {
      toast.error('Todos os passos precisam de provider, role e instruction')
      return
    }

    if (draft.id) {
      updateTemplate.mutate(
        {
          id: draft.id,
          name,
          description: draft.description.trim(),
          context_mode: draft.context_mode,
          steps,
        },
        {
          onSuccess: () => toast.success('Template atualizado'),
          onError: () => toast.error('Falha ao atualizar template'),
        }
      )
    } else {
      createTemplate.mutate(
        {
          name,
          description: draft.description.trim(),
          context_mode: draft.context_mode,
          steps,
        },
        {
          onSuccess: () => toast.success('Template criado'),
          onError: () => toast.error('Falha ao criar template'),
        }
      )
    }

    setDraft(null)
  }

  const removeTemplate = (template: PipelineTemplate) => {
    const ok = window.confirm(`Excluir template "${template.name}"?`)
    if (!ok) return
    deleteTemplate.mutate(
      { id: template.id },
      {
        onSuccess: () => toast.success('Template excluido'),
        onError: () => toast.error('Falha ao excluir template'),
      }
    )
  }

  return (
    <div className="space-y-6 px-4 pb-10 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.1em] text-blue-200">Night Worker</p>
          <h1 className="text-3xl font-bold text-foreground">Pipeline Templates</h1>
          <p className="text-sm text-muted-foreground">Crie fluxos multi-step e execute com prioridade automatica.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/nw/projects')} className="gap-2">
            <Briefcase className="h-4 w-4" /> Projetos
          </Button>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Novo Template
          </Button>
        </div>
      </div>

      {templatesQuery.isLoading && (
        <Card className="border border-white/10 bg-card/70 backdrop-blur">
          <CardContent className="py-6 text-sm text-muted-foreground">Carregando templates...</CardContent>
        </Card>
      )}

      {!templatesQuery.isLoading && orderedTemplates.length === 0 && (
        <Card className="border border-amber-500/30 bg-amber-500/10">
          <CardContent className="py-6 text-sm text-amber-100">Nenhum template encontrado.</CardContent>
        </Card>
      )}

      {draft && (
        <Card className="border border-blue-500/30 bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle>{draft.id ? 'Editar template' : 'Novo template'}</CardTitle>
            <CardDescription>
              Placeholders: {'{input}'} = prompt original, {'{previous_result}'} = resultado anterior, {'{all_results}'} = todos os resultados, {'{step_N_result}'} = resultado do step N.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={draft.name} onChange={(e) => setDraft((prev) => (prev ? { ...prev, name: e.target.value } : prev))} />
              </div>
              <div className="space-y-2">
                <Label>Descricao</Label>
                <Input
                  value={draft.description}
                  onChange={(e) => setDraft((prev) => (prev ? { ...prev, description: e.target.value } : prev))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Modo de Contexto</Label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setDraft((prev) => (prev ? { ...prev, context_mode: 'previous_only' } : prev))}
                  className={`rounded-lg border px-3 py-2 text-sm transition-colors ${draft.context_mode === 'previous_only' ? 'border-blue-500 bg-blue-500/20 text-blue-200' : 'border-border/60 bg-background/40 text-muted-foreground hover:bg-background/60'}`}
                >
                  So anterior
                </button>
                <button
                  type="button"
                  onClick={() => setDraft((prev) => (prev ? { ...prev, context_mode: 'all_steps' } : prev))}
                  className={`rounded-lg border px-3 py-2 text-sm transition-colors ${draft.context_mode === 'all_steps' ? 'border-emerald-500 bg-emerald-500/20 text-emerald-200' : 'border-border/60 bg-background/40 text-muted-foreground hover:bg-background/60'}`}
                >
                  Todos os steps
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {draft.context_mode === 'all_steps'
                  ? 'Cada step recebe o output de TODOS os steps anteriores, nao so o ultimo.'
                  : 'Cada step recebe apenas o output do step imediatamente anterior.'}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Passos</Label>
                <Button variant="outline" size="sm" onClick={addStep} className="gap-2">
                  <Plus className="h-4 w-4" /> Adicionar passo
                </Button>
              </div>

              {draft.steps.map((step, index) => (
                <div key={`${index}-${step.provider}-${step.role}`} className="space-y-3 rounded-xl border border-border/60 bg-background/40 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge variant="outline">Passo {index + 1}</Badge>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => moveStep(index, -1)} disabled={index === 0}>
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => moveStep(index, 1)}
                        disabled={index === draft.steps.length - 1}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeStep(index)}
                        disabled={draft.steps.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-[200px_1fr]">
                    <div className="space-y-2">
                      <Label>Provider</Label>
                      <select
                        value={step.provider}
                        onChange={(e) => updateStep(index, { provider: e.target.value })}
                        className="h-10 w-full rounded-md border border-border/60 bg-background/70 px-3 text-sm"
                      >
                        {PROVIDERS.map((provider) => (
                          <option key={provider} value={provider}>
                            {provider}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Input value={step.role} onChange={(e) => updateStep(index, { role: e.target.value })} placeholder="validate | code | review" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Instruction</Label>
                    <Textarea
                      rows={6}
                      value={step.instruction}
                      onChange={(e) => updateStep(index, { instruction: e.target.value })}
                      placeholder="Escreva a instrucao deste passo..."
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => setDraft(null)}>
                <X className="mr-2 h-4 w-4" /> Cancelar
              </Button>
              <Button onClick={saveDraft}>
                <Save className="mr-2 h-4 w-4" /> Salvar template
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {orderedTemplates.map((template) => (
          <Card key={template.id} className="border border-white/10 bg-card/70 backdrop-blur">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    {template.name}
                    <Badge variant="outline">v{template.version ?? 1}</Badge>
                  </CardTitle>
                  <CardDescription>{template.description || 'Sem descricao'}</CardDescription>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="outline" className="gap-1">
                    <GitBranch className="h-3.5 w-3.5" /> {template.steps.length} passos
                  </Badge>
                  <Badge variant="outline" className={template.context_mode === 'all_steps' ? 'border-emerald-500/50 text-emerald-300' : 'text-muted-foreground'}>
                    {template.context_mode === 'all_steps' ? 'Contexto completo' : 'So anterior'}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {template.steps.map((step, index) => (
                  <div key={`${template.id}-${index}`} className="flex items-center gap-2">
                    <Badge variant="secondary" className="whitespace-nowrap">
                      {index + 1}. {step.provider} {step.role}
                    </Badge>
                    {index < template.steps.length - 1 && <span className="text-muted-foreground">-&gt;</span>}
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                <p className="mb-2 text-xs uppercase tracking-[0.08em] text-muted-foreground">Providers</p>
                <div className="flex flex-wrap gap-2">
                  {template.steps.map((step, index) => (
                    <ProviderBadge key={`${template.id}-provider-${index}`} provider={step.provider} />
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={() => navigate(`/nw/projects?template=${template.id}`)}>
                  <Play className="mr-2 h-4 w-4" /> Executar
                </Button>
                <Button variant="outline" onClick={() => openEdit(template)} disabled={updateTemplate.isPending}>
                  <Pencil className="mr-2 h-4 w-4" /> Editar
                </Button>
                <Button variant="destructive" onClick={() => removeTemplate(template)} disabled={deleteTemplate.isPending}>
                  <Trash2 className="mr-2 h-4 w-4" /> Excluir
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
