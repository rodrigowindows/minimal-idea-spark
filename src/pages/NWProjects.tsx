import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
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
  useUpdateProjectMutation,
} from '@/hooks/useNightWorkerApi'
import { loadPipelineTemplates } from '@/lib/nightworker/pipelineTemplates'
import type { NightWorkerProject, PipelineConfig } from '@/types/night-worker'
import { ArrowRight, Briefcase, FolderPlus, GitBranch, Play, Plus, Send } from 'lucide-react'

const PROMPT_NAME_MAX_LENGTH = 500
const RECENT_PROMPTS_LIMIT = 10
const PROJECT_NAME_MIN_LENGTH = 3

type RunValues = {
  template_id: string
  content: string
  target_folder: string
}

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
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const templates = useMemo(() => loadPipelineTemplates(), [])
  const templateFromQuery = searchParams.get('template') ?? ''
  const projectFromQuery = searchParams.get('project') ?? ''

  const runSchema = useMemo(
    () =>
      z.object({
        template_id: z.string().min(1, t('projects.validation.selectTemplate')),
        content: z.string().min(10, t('projects.validation.promptMinLength')),
        target_folder: z.string().min(3, t('projects.validation.targetFolderMinLength')),
      }),
    [t]
  )

  const { data: allProjects = [], isLoading: loadingProjects } = useProjectsQuery('all')
  const projects = useMemo(() => allProjects.filter((entry) => entry.status !== 'archived'), [allProjects])
  const createProject = useCreateProjectMutation()
  const updateProject = useUpdateProjectMutation()
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
    if (projectFromQuery && projects.some((entry) => entry.id === projectFromQuery)) {
      setSelectedProjectId(projectFromQuery)
      return
    }
    if (selectedProjectId && projects.some((entry) => entry.id === selectedProjectId)) return
    setSelectedProjectId(projects[0].id)
  }, [projectFromQuery, projects, selectedProjectId])

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
    if (name.length < PROJECT_NAME_MIN_LENGTH) {
      toast.error(t('projects.toast.nameMinLength'))
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
          toast.success(t('projects.toast.created'))
          setSelectedProjectId(project.id)
          setNewProjectName('')
          setNewProjectDescription('')
          setNewProjectTarget('')
        },
        onError: () => {
          toast.error(t('projects.toast.createFailed'))
        },
      }
    )
  }

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
      slug(`${selectedProject.name}-${template.name}-step1-${firstStep.role}`).slice(0, PROMPT_NAME_MAX_LENGTH) ||
      `pipeline-step1-${firstStep.provider}`

    try {
      const res = await createPrompt.mutateAsync({
        provider: firstStep.provider,
        name: promptName,
        content: renderedContent,
        target_folder: values.target_folder,
        queue_stage: 'prioritized',
        project_id: selectedProject.id,
        pipeline_config: pipelineConfig,
        pipeline_id: pipelineId,
        pipeline_step: 1,
        pipeline_total_steps: template.steps.length,
        pipeline_template_name: template.name,
      })

      toast.success(t('projects.toast.processStarted'))
      navigate(`/nw/prompts/${res.id}`)
    } catch {
      toast.error(t('projects.toast.processFailed'))
    }
  }

  const handleToggleProjectStatus = (project: NightWorkerProject) => {
    const nextStatus = project.status === 'paused' ? 'active' : 'paused'
    updateProject.mutate({
      id: project.id,
      status: nextStatus,
    })
  }

  return (
    <div className="space-y-6 px-4 pb-10 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.1em] text-blue-200">Night Worker</p>
          <h1 className="text-3xl font-bold text-foreground">{t('projects.pageTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t('projects.pageDescription')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/nw/templates')}>
            <GitBranch className="mr-2 h-4 w-4" /> {t('projects.viewTemplates')}
          </Button>
          <Button onClick={handleCreateProject} disabled={createProject.isPending || !newProjectName.trim()}>
            <FolderPlus className="mr-2 h-4 w-4" /> {t('projects.createProject')}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1.4fr]">
        <Card className="border border-white/10 bg-card/70 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Briefcase className="h-5 w-5" /> {t('projects.sectionTitle')}
            </CardTitle>
            <CardDescription>{t('projects.sectionDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-border/60 bg-background/40 p-3 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="project-name">{t('projects.nameLabel')}</Label>
                <Input
                  id="project-name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder={t('projects.namePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-desc">{t('projects.descriptionLabel')}</Label>
                <Input
                  id="project-desc"
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  placeholder={t('projects.descriptionPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-target">{t('projects.targetFolderLabel')}</Label>
                <Input
                  id="project-target"
                  value={newProjectTarget}
                  onChange={(e) => setNewProjectTarget(e.target.value)}
                  placeholder={t('projects.targetFolderPlaceholder')}
                />
              </div>
            </div>

            {loadingProjects && (
              <p className="text-sm text-muted-foreground">{t('projects.loadingProjects')}</p>
            )}

            {!loadingProjects && projects.length === 0 && (
              <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-100">
                <AlertTitle>{t('projects.noProjectsTitle')}</AlertTitle>
                <AlertDescription>{t('projects.noProjectsDescription')}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              {projects.map((project) => (
                <div
                  key={project.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedProjectId(project.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setSelectedProjectId(project.id)
                    }
                  }}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    selectedProjectId === project.id
                      ? 'border-blue-500/50 bg-blue-500/10'
                      : project.status === 'paused'
                        ? 'border-amber-500/40 bg-amber-500/5 opacity-75 hover:border-amber-400/50'
                        : 'border-border/60 bg-background/40 hover:border-blue-400/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">{project.name}</p>
                      {project.status === 'paused' && (
                        <Badge className="border-amber-500/50 bg-amber-500/20 text-amber-100" variant="outline">
                          {t('projects.pausedBadge')}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{t('projects.promptsCount', { count: project.stats?.total ?? 0 })}</Badge>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={(event) => {
                          event.stopPropagation()
                          handleToggleProjectStatus(project)
                        }}
                        disabled={updateProject.isPending}
                      >
                        {project.status === 'paused' ? t('projects.resumeProject') : t('projects.pauseProject')}
                      </Button>
                    </div>
                  </div>
                  {project.description && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{project.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                    <span>{t('projects.stats.pending')} {project.stats?.pending ?? 0}</span>
                    <span>{t('projects.stats.processing')} {project.stats?.processing ?? 0}</span>
                    <span>{t('projects.stats.done')} {project.stats?.done ?? 0}</span>
                    <span>{t('projects.stats.failed')} {project.stats?.failed ?? 0}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border border-white/10 bg-card/70 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">{t('projects.runFlowTitle')}</CardTitle>
              <CardDescription>
                {t('projects.currentProject')} {selectedProject ? <strong>{selectedProject.name}</strong> : t('projects.selectProjectPrompt')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedProject ? (
                <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-100">
                  <AlertTitle>{t('projects.selectProjectTitle')}</AlertTitle>
                  <AlertDescription>{t('projects.selectProjectDescription')}</AlertDescription>
                </Alert>
              ) : (
                <form className="space-y-4" onSubmit={runForm.handleSubmit(onRun)}>
                  {selectedProject.status === 'paused' && (
                    <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-100">
                      <AlertDescription>{t('projects.pausedMessage')}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="template_id">{t('projects.templateLabel')}</Label>
                    <select
                      id="template_id"
                      className="h-10 w-full rounded-md border border-border/60 bg-background/70 px-3 text-sm"
                      value={selectedTemplateId || ''}
                      onChange={(e) => runForm.setValue('template_id', e.target.value, { shouldDirty: true })}
                    >
                      <option value="">{t('projects.templateSelectDefault')}</option>
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
                    <Label htmlFor="content">{t('projects.promptLabel')}</Label>
                    <Textarea id="content" rows={8} {...runForm.register('content')} placeholder={t('projects.promptPlaceholder')} />
                    {runForm.formState.errors.content && (
                      <p className="text-xs text-red-400">{runForm.formState.errors.content.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="target_folder">{t('projects.targetFolderFormLabel')}</Label>
                    <Input id="target_folder" {...runForm.register('target_folder')} />
                    {runForm.formState.errors.target_folder && (
                      <p className="text-xs text-red-400">{runForm.formState.errors.target_folder.message}</p>
                    )}
                  </div>

                  {selectedTemplate && (
                    <div className="rounded-xl border border-border/60 bg-background/40 p-3 space-y-2">
                      <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">{t('projects.selectedFlow')}</p>
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
                    <Button type="submit" disabled={createPrompt.isPending || !selectedProject || selectedProject.status === 'paused'}>
                      {createPrompt.isPending ? (
                        <>
                          <Send className="mr-2 h-4 w-4 animate-pulse" /> {t('projects.starting')}
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" /> {t('projects.startProcess')}
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
              <CardTitle className="text-base">{t('projects.projectPromptsTitle')}</CardTitle>
              <CardDescription>{t('projects.projectPromptsDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {!selectedProject && <p className="text-sm text-muted-foreground">{t('projects.selectProjectForPrompts')}</p>}
              {selectedProject && promptsQuery.isLoading && <p className="text-sm text-muted-foreground">{t('projects.loadingPrompts')}</p>}
              {selectedProject && !promptsQuery.isLoading && (promptsQuery.data?.length ?? 0) === 0 && (
                <p className="text-sm text-muted-foreground">{t('projects.noPromptsYet')}</p>
              )}
              {selectedProject &&
                (promptsQuery.data ?? []).slice(0, RECENT_PROMPTS_LIMIT).map((prompt) => (
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
                    <p className="mt-1 text-xs text-muted-foreground">{t('projects.updatedAt')} {formatDate(prompt.updated_at || prompt.created_at)}</p>
                  </button>
                ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" onClick={() => navigate('/nw/prompts')}>
          <Plus className="mr-2 h-4 w-4" /> {t('projects.openFullQueue')}
        </Button>
      </div>
    </div>
  )
}
