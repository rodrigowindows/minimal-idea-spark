import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ProviderBadge } from '@/components/night-worker/ProviderBadge'
import { toast } from 'sonner'
import { ArrowDown, ArrowUp, GitBranch, Pencil, Play, Plus, Save, Trash2, X } from 'lucide-react'
import type { NightWorkerProvider, PipelineStep, PipelineTemplate } from '@/types/night-worker'
import { loadPipelineTemplates, savePipelineTemplates } from '@/lib/nightworker/pipelineTemplates'

interface TemplateDraft {
  id?: string
  name: string
  description: string
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
    steps: [createEmptyStep()],
  }
}

export default function NWTemplates() {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<PipelineTemplate[]>([])
  const [loaded, setLoaded] = useState(false)
  const [draft, setDraft] = useState<TemplateDraft | null>(null)

  useEffect(() => {
    setTemplates(loadPipelineTemplates())
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    savePipelineTemplates(templates)
  }, [loaded, templates])

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

    const now = new Date().toISOString()

    if (draft.id) {
      setTemplates((prev) =>
        prev.map((template) =>
          template.id === draft.id
            ? {
                ...template,
                name,
                description: draft.description.trim(),
                steps,
                updated_at: now,
              }
            : template
        )
      )
      toast.success('Template atualizado')
    } else {
      setTemplates((prev) => [
        {
          id: crypto.randomUUID(),
          name,
          description: draft.description.trim(),
          steps,
          created_at: now,
          updated_at: now,
        },
        ...prev,
      ])
      toast.success('Template criado')
    }

    setDraft(null)
  }

  const removeTemplate = (template: PipelineTemplate) => {
    const ok = window.confirm(`Excluir template "${template.name}"?`)
    if (!ok) return
    setTemplates((prev) => prev.filter((t) => t.id !== template.id))
    toast.success('Template excluido')
  }

  return (
    <div className="space-y-6 px-4 pb-10 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.1em] text-blue-200">Night Worker</p>
          <h1 className="text-3xl font-bold text-foreground">Pipeline Templates</h1>
          <p className="text-sm text-muted-foreground">Crie fluxos multi-step e execute com prioridade automatica.</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Template
        </Button>
      </div>

      {draft && (
        <Card className="border border-blue-500/30 bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle>{draft.id ? 'Editar template' : 'Novo template'}</CardTitle>
            <CardDescription>
              Use {'{input}'} para o prompt original e {'{previous_result}'} para o resultado do passo anterior.
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
                  <CardTitle className="text-xl">{template.name}</CardTitle>
                  <CardDescription>{template.description || 'Sem descricao'}</CardDescription>
                </div>
                <Badge variant="outline" className="gap-1">
                  <GitBranch className="h-3.5 w-3.5" /> {template.steps.length} passos
                </Badge>
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
                <Button variant="outline" onClick={() => navigate(`/nw/templates/${template.id}/run`)}>
                  <Play className="mr-2 h-4 w-4" /> Executar
                </Button>
                <Button variant="outline" onClick={() => openEdit(template)}>
                  <Pencil className="mr-2 h-4 w-4" /> Editar
                </Button>
                <Button variant="destructive" onClick={() => removeTemplate(template)}>
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
