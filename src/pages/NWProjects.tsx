import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ProviderBadge } from '@/components/night-worker/ProviderBadge'
import { StatusBadge } from '@/components/night-worker/StatusBadge'
import {
  useCreateProjectMutation,
  useCreatePromptMutation,
  useProjectPromptsQuery,
  useProjectsQuery,
} from '@/hooks/useNightWorkerApi'
import { loadPipelineTemplates } from '@/lib/nightworker/pipelineTemplates'
import type { PipelineConfig } from '@/types/night-worker'
import { ArrowRight, Briefcase, FolderPlus, GitBranch, Play, Plus, Send } from 'lucide-react'

const runSchema = z.object({
  template_id: z.string().min(1, 'Selecione um template'),
  content: z.string().min(10, 'Informe o prompt base'),
  target_folder: z.string().min(3, 'Informe a pasta alvo'),
})

type RunValues = z.infer<typeof runSchema>

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString()
}

export default function NWProjects() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const templates = useMemo(() => loadPipelineTemplates(), [])
  const templateFromQuery = searchParams.get('template') ?? ''

  const { data: projects = [], isLoading: loadingProjects } = useProjectsQuery('active')
  const createProject = useCreateProjectMutation()
  const createPrompt = useCreatePromptMutation()

  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  const [newProjectTarget, setNewProjectTarget] = useState('')

  const selectedProject = useMemo(
    () => projects.find((entry) => entry.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  )

  const promptsQuery = useProjectPromptsQuery(selectedProjectId || null, 30)

  const runForm = useForm<RunValues>({
    resolver: zodResolver(runSchema),
    defaultValues: {
      template_id: '',
      content: '',
      target_folder: 'C:\\code\\meu-projeto',
    },
  })
  const selectedTemplateId = runForm.watch('template_id')

  useEffect(() => {
    if (!projects.length) return
    if (selectedProjectId && projects.some((entry) => entry.id === selectedProjectId)) return
    setSelectedProjectId(projects[0].id)
  }, [projects, selectedProjectId])

  useEffect(() => {
    const fallbackTemplateId = templates[0]?.id ?? ''
    const chosen = templates.some((entry) => entry.id === templateFromQuery) ? templateFromQuery : fallbackTemplateId
    if (!chosen) return
    if (runForm.getValues('template_id')) return
    runForm.setValue('template_id', chosen, { shouldDirty: false })
  }, [runForm, templateFromQuery, templates])

  useEffect(() => {
    if (!selectedProject?.default_target_folder) return
    const current = runForm.getValues('target_folder')
    if (!current || current === 'C:\\code\\meu-projeto') {
      runForm.setValue('target_folder', selectedProject.default_target_folder)
    }
  }, [selectedProject, runForm])

  const selectedTemplate = useMemo(() => {
    return templates.find((entry) => entry.id === selectedTemplateId) ?? null
  }, [selectedTemplateId, templates])

  const handleCreateProject = () => {
    const name = newProjectName.trim()
    if (name.length < 3) {
      toast.error('Nome do projeto precisa ter pelo menos 3 caracteres')
      return
    }

    createProject.mutate(
      {
        name,
        description: newProjectDescription.trim() || null,
        default_target_folder: newProjectTarget.trim() || null,
      },
      {
        onSuccess: (project) => {
          toast.success('Projeto criado')
          setSelectedProjectId(project.id)
          setNewProjectName('')
          setNewProjectDescription('')
          setNewProjectTarget('')
        },
        onError: () => {
          toast.error('Falha ao criar projeto')
        },
      }
    )
  }

  const onRun = async (values: RunValues) => {
    if (!selectedProject) {
      toast.error('Selecione um projeto')
      return
    }

    const template = templates.find((entry) => entry.id === values.template_id)
    if (!template || template.steps.length === 0) {
      toast.error('Template invalido')
      return
    }

    const pipelineId = crypto.randomUUID()
    const firstStep = template.steps[0]
    const pipelineConfig: PipelineConfig = {
      template_version: 1,
      steps: template.steps,
      original_input: values.content,
    }

    const renderedContent = firstStep.instruction
      .split('{input}')
      .join(values.content)
      .split('{previous_result}')
      .join('')

    const promptName =
      slug(`${selectedProject.name}-${template.name}-step1-${firstStep.role}`).slice(0, 500) ||
      `pipeline-step1-${firstStep.provider}`

    try {
      const res = await createPrompt.mutateAsync({
        provider: firstStep.provider,
        name: promptName,
        content: renderedContent,
        target_folder: values.target_folder,
        queue_stage: 'prioritized',
        project_id: selectedProject.id,
        pipeline_config: pipelineConfig as unknown as Record<string, unknown>,
        pipeline_id: pipelineId,
        pipeline_step: 1,
        pipeline_total_steps: template.steps.length,
        pipeline_template_name: template.name,
      })

      toast.success('Processo iniciado no projeto')
      navigate(`/nw/prompts/${res.id}`)
    } catch {
      toast.error('Falha ao iniciar processo')
    }
  }

  return (
    <div className="space-y-6 px-4 pb-10 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.1em] text-blue-200">Night Worker</p>
          <h1 className="text-3xl font-bold text-foreground">Projetos e Processos</h1>
          <p className="text-sm text-muted-foreground">
            Separe fluxos por projeto e execute templates de pipeline com rastreabilidade completa.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/nw/templates')}>
            <GitBranch className="mr-2 h-4 w-4" /> Ver templates
          </Button>
          <Button onClick={handleCreateProject} disabled={createProject.isPending || !newProjectName.trim()}>
            <FolderPlus className="mr-2 h-4 w-4" /> Criar projeto
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1.4fr]">
        <Card className="border border-white/10 bg-card/70 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Briefcase className="h-5 w-5" /> Projetos
            </CardTitle>
            <CardDescription>Cada projeto organiza prompts e pipelines do mesmo processo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-border/60 bg-background/40 p-3 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="project-name">Nome</Label>
                <Input
                  id="project-name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Ex.: Projeto API Checkout"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-desc">Descricao</Label>
                <Input
                  id="project-desc"
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  placeholder="Objetivo do processo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-target">Pasta padrao (opcional)</Label>
                <Input
                  id="project-target"
                  value={newProjectTarget}
                  onChange={(e) => setNewProjectTarget(e.target.value)}
                  placeholder="C:\\code\\meu-projeto"
                />
              </div>
            </div>

            {loadingProjects && (
              <p className="text-sm text-muted-foreground">Carregando projetos...</p>
            )}

            {!loadingProjects && projects.length === 0 && (
              <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-100">
                <AlertTitle>Nenhum projeto ainda</AlertTitle>
                <AlertDescription>Crie um projeto para separar e controlar o fluxo com templates.</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              {projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => setSelectedProjectId(project.id)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    selectedProjectId === project.id
                      ? 'border-blue-500/50 bg-blue-500/10'
                      : 'border-border/60 bg-background/40 hover:border-blue-400/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-foreground">{project.name}</p>
                    <Badge variant="outline">{project.stats?.total ?? 0} prompts</Badge>
                  </div>
                  {project.description && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{project.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                    <span>Pendentes: {project.stats?.pending ?? 0}</span>
                    <span>Processando: {project.stats?.processing ?? 0}</span>
                    <span>Done: {project.stats?.done ?? 0}</span>
                    <span>Falhas: {project.stats?.failed ?? 0}</span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border border-white/10 bg-card/70 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">Executar Fluxo com Template</CardTitle>
              <CardDescription>
                Projeto atual: {selectedProject ? <strong>{selectedProject.name}</strong> : 'selecione um projeto'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedProject ? (
                <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-100">
                  <AlertTitle>Selecione um projeto</AlertTitle>
                  <AlertDescription>Escolha um projeto na coluna da esquerda para iniciar o fluxo.</AlertDescription>
                </Alert>
              ) : (
                <form className="space-y-4" onSubmit={runForm.handleSubmit(onRun)}>
                  <div className="space-y-2">
                    <Label htmlFor="template_id">Template</Label>
                    <select
                      id="template_id"
                      className="h-10 w-full rounded-md border border-border/60 bg-background/70 px-3 text-sm"
                      value={selectedTemplateId || ''}
                      onChange={(e) => runForm.setValue('template_id', e.target.value, { shouldDirty: true })}
                    >
                      <option value="">Selecione</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                    {runForm.formState.errors.template_id && (
                      <p className="text-xs text-red-400">{runForm.formState.errors.template_id.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="content">Prompt base</Label>
                    <Textarea id="content" rows={8} {...runForm.register('content')} placeholder="Descreva a tarefa principal..." />
                    {runForm.formState.errors.content && (
                      <p className="text-xs text-red-400">{runForm.formState.errors.content.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="target_folder">Pasta alvo</Label>
                    <Input id="target_folder" {...runForm.register('target_folder')} />
                    {runForm.formState.errors.target_folder && (
                      <p className="text-xs text-red-400">{runForm.formState.errors.target_folder.message}</p>
                    )}
                  </div>

                  {selectedTemplate && (
                    <div className="rounded-xl border border-border/60 bg-background/40 p-3 space-y-2">
                      <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Fluxo selecionado</p>
                      <div className="flex flex-wrap items-center gap-2">
                        {selectedTemplate.steps.map((step, index) => (
                          <div key={`${selectedTemplate.id}-${index}`} className="flex items-center gap-2">
                            <Badge variant="secondary" className="whitespace-nowrap">
                              {index + 1}. {step.provider} {step.role}
                            </Badge>
                            {index < selectedTemplate.steps.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button type="submit" disabled={createPrompt.isPending || !selectedProject}>
                      {createPrompt.isPending ? (
                        <>
                          <Send className="mr-2 h-4 w-4 animate-pulse" /> Iniciando...
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" /> Iniciar processo
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          <Card className="border border-white/10 bg-card/70 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-base">Prompts do Projeto</CardTitle>
              <CardDescription>Ultimas execucoes ligadas ao projeto selecionado.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {!selectedProject && <p className="text-sm text-muted-foreground">Selecione um projeto para ver os prompts.</p>}
              {selectedProject && promptsQuery.isLoading && <p className="text-sm text-muted-foreground">Carregando prompts...</p>}
              {selectedProject && !promptsQuery.isLoading && (promptsQuery.data?.length ?? 0) === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum prompt neste projeto ainda.</p>
              )}
              {selectedProject &&
                (promptsQuery.data ?? []).slice(0, 10).map((prompt) => (
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
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" onClick={() => navigate('/nw/prompts')}>
          <Plus className="mr-2 h-4 w-4" /> Abrir fila completa
        </Button>
      </div>
    </div>
  )
}
