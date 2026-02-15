import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ProviderBadge } from '@/components/night-worker/ProviderBadge'
import { useCreatePromptMutation } from '@/hooks/useNightWorkerApi'
import { useNightWorker } from '@/contexts/NightWorkerContext'
import { toast } from 'sonner'
import { Bot, RotateCcw, Send, Sparkles, Wand2 } from 'lucide-react'

const schema = z.object({
  provider: z.enum(['codex', 'claude', 'gemini']),
  name: z.string().min(3, 'Mínimo de 3 caracteres').regex(/^[a-z0-9-]+$/, 'Use apenas letras, números e hifens'),
  target_folder: z.string().min(3, 'Informe a pasta alvo'),
  content: z.string().min(10, 'Informe o prompt'),
})

type FormValues = z.infer<typeof schema>

export default function NWSubmit() {
  const navigate = useNavigate()
  const { isConnected } = useNightWorker()
  const [charCount, setCharCount] = useState(0)
  const mutation = useCreatePromptMutation()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { provider: 'codex', name: '', target_folder: 'C:\\\\code\\\\meu-projeto', content: '' },
  })

  // No redirect check - allow page to work regardless of isConnected state
  // (removed to prevent infinite loops when token is not configured)

  const onSubmit = async (values: FormValues) => {
    try {
      const { id } = await mutation.mutateAsync(values as { provider: string; name: string; content: string; target_folder: string })
      toast.success('Prompt enviado', { description: `ID: ${id}` })
      navigate(`/nw/prompts/${id}`)
    } catch (err) {
      toast.error('Erro ao enviar prompt')
    }
  }

  const selectedProvider = form.watch('provider')
  const nameValue = form.watch('name')
  const contentValue = form.watch('content')
  const folderValue = form.watch('target_folder')

  const previewSize = useMemo(() => contentValue.length, [contentValue])

  return (
    <div className="px-4 pb-10 md:px-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.1em] text-blue-200">Envio manual</p>
          <h1 className="text-3xl font-bold text-foreground">Enviar Prompt</h1>
          <p className="text-sm text-muted-foreground">Selecione o provider, defina a pasta alvo e envie o conteúdo.</p>
        </div>
        <Badge variant="outline" className="rounded-full border-blue-500/40 bg-blue-500/10 text-blue-200">POST /prompts</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="border border-white/10 bg-card/70 backdrop-blur">
          <CardHeader>
            <CardTitle>Dados do Prompt</CardTitle>
            <CardDescription>Validação automática e envio com loading state.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['codex', 'claude', 'gemini'] as const).map((provider) => {
                      const active = selectedProvider === provider
                      const Icon = provider === 'codex' ? Bot : Sparkles
                      return (
                        <button
                          key={provider}
                          type="button"
                          onClick={() => form.setValue('provider', provider)}
                          className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                            active
                              ? 'border-blue-500/60 bg-blue-500/10 text-blue-100 shadow-[0_10px_50px_-20px_rgba(59,130,246,0.7)]'
                              : 'border-border/60 bg-background/40 text-muted-foreground hover:border-blue-500/40'
                          }`}
                          aria-pressed={active}
                        >
                          <Icon className="h-5 w-5" aria-hidden />
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold capitalize">{provider}</span>
                            <span className="text-xs text-muted-foreground">
                              {provider === 'codex' ? 'Codex CLI' : provider === 'claude' ? 'Claude CLI' : 'Gemini CLI'}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">Seleção obrigatória.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Prompt</Label>
                  <Input
                    id="name"
                    placeholder="ex: criar-componente-login"
                    {...form.register('name', {
                      onChange: (e) => {
                        const formatted = e.target.value.replace(/\s+/g, '-').toLowerCase()
                        form.setValue('name', formatted, { shouldValidate: true })
                      },
                    })}
                    className="bg-background/60"
                  />
                  <p className="text-xs text-muted-foreground">Sem espaços. Min 3 caracteres.</p>
                  {form.formState.errors.name && <p className="text-xs text-red-400">{form.formState.errors.name.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="target_folder">Pasta Alvo</Label>
                <Input
                  id="target_folder"
                  placeholder="C:\\code\\meu-projeto"
                  {...form.register('target_folder')}
                  className="bg-background/60"
                />
                <p className="text-xs text-muted-foreground">Pasta do projeto onde a AI vai trabalhar.</p>
                {form.formState.errors.target_folder && <p className="text-xs text-red-400">{form.formState.errors.target_folder.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Conteúdo do Prompt</Label>
                <div className="relative">
                  <Textarea
                    id="content"
                    rows={10}
                    placeholder="Explique o que deseja que o worker faça..."
                    {...form.register('content', {
                      onChange: (e) => setCharCount(e.target.value.length),
                    })}
                    className="min-h-[200px] resize-y bg-background/60 pr-14"
                  />
                  <span className="absolute bottom-2 right-3 text-xs text-muted-foreground">{charCount} chars</span>
                </div>
                {form.formState.errors.content && <p className="text-xs text-red-400">{form.formState.errors.content.message}</p>}
              </div>

              <div className="flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => form.reset()}
                  className="gap-2"
                >
                  <RotateCcw className="h-4 w-4" /> Limpar
                </Button>
                <Button type="submit" className="gap-2" disabled={mutation.isPending}>
                  {mutation.isPending ? (
                    <>
                      <Wand2 className="h-4 w-4 animate-spin" /> Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" /> Enviar Prompt
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border border-blue-500/30 bg-gradient-to-b from-blue-500/10 via-transparent to-background/20">
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>Como o prompt será enviado.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <ProviderBadge provider={selectedProvider} />
              <Badge variant="outline" className="rounded-full border-border/50 bg-background/40">
                {previewSize} chars
              </Badge>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Nome</p>
              <p className="text-lg font-semibold text-foreground">{nameValue || 'sem-nome'}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Pasta Alvo</p>
              <p className="font-mono text-sm text-blue-200">{folderValue}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground mb-2">Conteúdo</p>
              <div className="prose prose-invert max-w-none text-sm leading-relaxed">
                {contentValue ? contentValue : <span className="text-muted-foreground">Seu prompt aparecerá aqui.</span>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
