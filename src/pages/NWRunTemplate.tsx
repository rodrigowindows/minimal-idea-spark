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
import { useCreatePromptMutation } from '@/hooks/useNightWorkerApi'
import { loadPipelineTemplates } from '@/lib/nightworker/pipelineTemplates'
import type { PipelineConfig } from '@/types/night-worker'
import { toast } from 'sonner'
import { ArrowLeft, Play, Send } from 'lucide-react'

const schema = z.object({
  content: z.string().min(10, 'Informe o prompt base'),
  target_folder: z.string().min(3, 'Informe a pasta alvo'),
})

type FormValues = z.infer<typeof schema>

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function NWRunTemplate() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const createPrompt = useCreatePromptMutation()

  const template = useMemo(() => {
    const templates = loadPipelineTemplates()
    return templates.find((entry) => entry.id === id) ?? null
  }, [id])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      content: '',
      target_folder: 'C:\\code\\meu-projeto',
    },
  })

  const onSubmit = async (values: FormValues) => {
    if (!template || template.steps.length === 0) return

    const pipelineId = crypto.randomUUID()
    const firstStep = template.steps[0]

    const pipelineConfig: PipelineConfig = {
      template_version: 1,
      steps: template.steps,
      original_input: values.content,
    }

    const promptName = slug(`${template.name}-step1-${firstStep.role}`).slice(0, 500) || `pipeline-step1-${firstStep.provider}`
    const renderedContent = firstStep.instruction
      .split('{input}')
      .join(values.content)
      .split('{previous_result}')
      .join('')

    try {
      const res = await createPrompt.mutateAsync({
        provider: firstStep.provider,
        name: promptName,
        content: renderedContent,
        target_folder: values.target_folder,
        pipeline_config: pipelineConfig,
        pipeline_id: pipelineId,
        pipeline_step: 1,
        pipeline_total_steps: template.steps.length,
        pipeline_template_name: template.name,
        queue_stage: 'prioritized',
      })

      toast.success('Pipeline iniciado')
      navigate(`/nw/prompts/${res.id}`)
    } catch (error) {
      toast.error('Falha ao iniciar pipeline')
    }
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

              <div className="flex justify-end">
                <Button type="submit" disabled={createPrompt.isPending}>
                  {createPrompt.isPending ? (
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
