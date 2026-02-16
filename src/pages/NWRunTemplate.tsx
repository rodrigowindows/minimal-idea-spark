import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ProviderBadge } from '@/components/night-worker/ProviderBadge'
import { useCreatePipeline, useProjectsQuery, useTemplatesQuery } from '@/hooks/useNightWorkerApi'
import { toast } from 'sonner'
import { ArrowLeft, Play, Send } from 'lucide-react'

const schema = z.object({
  content: z.string().min(10, 'Informe o prompt base'),
  target_folder: z.string().min(3, 'Informe a pasta alvo'),
  project_id: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export default function NWRunTemplate() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { runPipeline, isLoading: pipelineLoading } = useCreatePipeline()
  const { data: projects = [] } = useProjectsQuery('active')
  const { data: templates = [], isLoading: loadingTemplates } = useTemplatesQuery()

  const template = useMemo(() => {
    return templates.find((entry) => entry.id === id) ?? null
  }, [id, templates])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      content: '',
      target_folder: 'C:\\code\\meu-projeto',
      project_id: '',
    },
  })
  const selectedProjectId = form.watch('project_id')

  const selectedProject = useMemo(() => {
    return projects.find((project) => project.id === selectedProjectId) ?? null
  }, [projects, selectedProjectId])

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

  if (loadingTemplates) {
    return (
      <div className="space-y-4 px-4 pb-10 md:px-8">
        <Button variant="ghost" onClick={() => navigate('/nw/templates')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Alert className="border-blue-500/40 bg-blue-500/10 text-blue-100">
          <AlertTitle>Carregando template</AlertTitle>
          <AlertDescription>Aguarde enquanto os templates sao carregados.</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!template) {
    return (
      <div className="space-y-4 px-4 pb-10 md:px-8">
        <Button variant="ghost" onClick={() => navigate('/nw/templates')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Alert className="border-red-500/40 bg-red-500/10 text-red-100">
          <AlertTitle>Template nao encontrado</AlertTitle>
          <AlertDescription>Selecione um template valido para iniciar um pipeline.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6 px-4 pb-10 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.1em] text-blue-200">Pipeline Runner</p>
          <h1 className="text-3xl font-bold text-foreground">Executar Template</h1>
          <p className="text-sm text-muted-foreground">{template.name}</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/nw/templates')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para templates
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card className="border border-white/10 bg-card/70 backdrop-blur">
          <CardHeader>
            <CardTitle>Entrada do pipeline</CardTitle>
            <CardDescription>
              O primeiro passo e criado agora. Os proximos serao criados automaticamente apos sucesso de cada etapa.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="space-y-2">
                <Label htmlFor="content">Prompt base</Label>
                <Textarea id="content" rows={10} {...form.register('content')} placeholder="Descreva a tarefa principal..." />
                {form.formState.errors.content && (
                  <p className="text-xs text-red-400">{form.formState.errors.content.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="target_folder">Pasta alvo</Label>
                <Input id="target_folder" {...form.register('target_folder')} />
                {form.formState.errors.target_folder && (
                  <p className="text-xs text-red-400">{form.formState.errors.target_folder.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="project_id">Projeto (opcional)</Label>
                <select
                  id="project_id"
                  className="h-10 w-full rounded-md border border-border/60 bg-background/70 px-3 text-sm"
                  value={selectedProjectId || ''}
                  onChange={(e) => {
                    const next = e.target.value
                    form.setValue('project_id', next, { shouldDirty: true })
                    if (next) {
                      const project = projects.find((entry) => entry.id === next)
                      if (project?.default_target_folder) {
                        form.setValue('target_folder', project.default_target_folder)
                      }
                    }
                  }}
                >
                  <option value="">Sem projeto</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                {selectedProject?.description && (
                  <p className="text-xs text-muted-foreground">{selectedProject.description}</p>
                )}
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={pipelineLoading}>
                  {pipelineLoading ? (
                    <>
                      <Send className="mr-2 h-4 w-4 animate-pulse" /> Iniciando...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" /> Iniciar pipeline
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border border-blue-500/30 bg-gradient-to-b from-blue-500/10 via-transparent to-background/20">
          <CardHeader>
            <CardTitle>Fluxo</CardTitle>
            <CardDescription>{template.description || 'Sem descricao'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {template.steps.map((step, index) => (
              <div key={`${template.id}-${index}`} className="rounded-xl border border-border/60 bg-background/40 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Badge variant="outline">Passo {index + 1}</Badge>
                  <ProviderBadge provider={step.provider} />
                </div>
                <p className="text-sm font-semibold text-foreground">{step.role}</p>
                <p className="mt-2 line-clamp-4 text-xs text-muted-foreground whitespace-pre-wrap">{step.instruction}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
