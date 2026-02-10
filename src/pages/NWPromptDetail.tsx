import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/night-worker/StatusBadge'
import { ProviderBadge } from '@/components/night-worker/ProviderBadge'
import { useCreatePromptMutation, usePromptStatusQuery } from '@/hooks/useNightWorkerApi'
import { useNightWorker } from '@/contexts/NightWorkerContext'
import { toast } from 'sonner'
import { ArrowLeft, Copy, ExternalLink, Loader2, RefreshCw, Send } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export default function NWPromptDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isConnected } = useNightWorker()
  const { data, isLoading, isError, error, refetch, isFetching } = usePromptStatusQuery(id)
  const resend = useCreatePromptMutation()

  const handleCopy = (text?: string | null) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    toast.success('Copiado para a área de transferência')
  }

  const handleResend = async () => {
    if (!data?.content) {
      toast.error('Conteúdo não disponível para reenviar.')
      return
    }
    try {
      const payload = {
        provider: data.provider || 'codex',
        name: `${data.name}-retry`,
        content: data.content,
        target_folder: data.target_folder || '',
      }
      const { id: newId } = await resend.mutateAsync(payload)
      toast.success('Reenviado', { description: `Novo ID: ${newId}` })
      navigate(`/prompts/${newId}`)
    } catch {
      toast.error('Falha ao reenviar')
    }
  }

  if (!id) return null

  return (
    <div className="px-4 pb-10 md:px-8">
      {!isConnected && (
        <Alert className="mb-4 border-amber-500/40 bg-amber-500/10 text-amber-100">
          <AlertTitle>Configure a conexão</AlertTitle>
          <AlertDescription>
            Defina a URL/token em <button className="underline" onClick={() => navigate('/connect')}>/connect</button> para ver os detalhes.
          </AlertDescription>
        </Alert>
      )}
      {isError && (
        <Alert className="mb-4 border-red-500/40 bg-red-500/10 text-red-100">
          <AlertTitle>Erro ao carregar prompt</AlertTitle>
          <AlertDescription className="space-y-2">
            <div>{error instanceof Error ? error.message : 'Não foi possível consultar o prompt.'}</div>
            <Button size="sm" variant="outline" onClick={() => refetch()}>Tentar novamente</Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/prompts')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <p className="text-xs uppercase tracking-[0.1em] text-blue-200">Detalhe do prompt</p>
            <h1 className="text-3xl font-bold text-foreground">{data?.name || '...'}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {data && <StatusBadge status={data.status} pulse={data.status === 'pending'} />}
              {data && <ProviderBadge provider={data.provider} />}
              <Badge variant="outline" className="font-mono text-xs">
                ID: {id}
              </Badge>
            </div>
          </div>
        </div>
        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

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
                  <CardDescription>Conteúdo original</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleCopy(data.content)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border border-border/60 bg-background/50 p-4">
                  <ReactMarkdown className="prose prose-invert max-w-none text-sm leading-relaxed">
                    {data.content || '_Sem conteúdo disponível_'}
                  </ReactMarkdown>
                </div>
                <div className="grid gap-3 md:grid-cols-2 text-sm">
                  <MetaItem label="Pasta alvo" value={data.target_folder || '—'} />
                  <MetaItem label="Tamanho" value={`${(data.content?.length ?? 0)} chars`} />
                  <MetaItem label="Provider" value={data.provider} />
                  <MetaItem label="Atualizado" value={formatDate(data.updated_at || data.created_at)} />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-white/10 bg-card/70 backdrop-blur">
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle>Resultado</CardTitle>
                  <CardDescription>
                    {data.status === 'pending' && 'Aguardando processamento...'}
                    {data.status === 'done' && 'Conteúdo renderizado'}
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
                {data.status === 'pending' && (
                  <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/60 bg-background/40 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <p>Aguardando processamento...</p>
                  </div>
                )}

                {data.status === 'failed' && (
                  <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
                    <p className="font-semibold">Erro</p>
                    <p className="mt-2 whitespace-pre-wrap">{data.error || 'Sem detalhes do erro.'}</p>
                    {data.attempts && <p className="mt-2 text-xs text-red-200">Tentativas: {data.attempts}</p>}
                  </div>
                )}

                {data.status === 'done' && (
                  <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-4">
                    <ReactMarkdown className="prose prose-invert max-w-none text-sm leading-relaxed">
                      {data.result_content || '_Sem conteúdo retornado_'}
                    </ReactMarkdown>
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
              <Button variant="outline" onClick={() => navigate('/prompts')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para lista
              </Button>
              <Button onClick={handleResend} disabled={resend.isPending}>
                <Send className="mr-2 h-4 w-4" /> Reenviar
              </Button>
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
      <p className="text-foreground font-semibold">{value ?? '—'}</p>
    </div>
  )
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString()
}
