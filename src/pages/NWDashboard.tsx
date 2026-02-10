import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { MetricCard } from '@/components/night-worker/MetricCard'
import { WorkerCard } from '@/components/night-worker/WorkerCard'
import { StatusBadge } from '@/components/night-worker/StatusBadge'
import { ProviderBadge } from '@/components/night-worker/ProviderBadge'
import { useHealthQuery, usePromptsQuery } from '@/hooks/useNightWorkerApi'
import { useNightWorker } from '@/contexts/NightWorkerContext'
import { isToday, parseISO } from 'date-fns'
import { AlertCircle, CheckCircle2, Clock3, Cpu, Settings2 } from 'lucide-react'
import type { HealthResponse, PromptItem } from '@/types/night-worker'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export default function NWDashboard() {
  const healthQuery = useHealthQuery()
  const promptsQuery = usePromptsQuery(10000)
  const { config, isConnected } = useNightWorker()
  const navigate = useNavigate()

  useEffect(() => {
    console.info('[NightWorker][Dashboard] state', {
      isConnected,
      healthStatus: healthQuery.data?.status,
      healthError: healthQuery.error ? String(healthQuery.error) : null,
      promptsCount: promptsQuery.data?.length ?? 0,
      promptsError: promptsQuery.error ? String(promptsQuery.error) : null,
    })
  }, [healthQuery.data?.status, healthQuery.error, promptsQuery.data?.length, promptsQuery.error, isConnected])

  const stats = useMemo(() => {
    const pending = promptsQuery.data?.filter((p) => p.status === 'pending').length ?? 0
    const failures = promptsQuery.data?.filter((p) => p.status === 'failed').length ?? 0
    const processedToday =
      promptsQuery.data?.filter((p) => {
        const dt = p.updated_at || p.created_at
        return p.status === 'done' && dt && isToday(parseDate(dt))
      }).length ?? 0
    const activeWorkers = healthQuery.data?.workers?.filter((w) => w.active).length
      ?? ['claude', 'codex'].filter((w) => config.workers[w as 'claude' | 'codex'].active).length
    return { pending, failures, processedToday, activeWorkers }
  }, [config.workers, healthQuery.data?.workers, promptsQuery.data])

  const lastPrompts = useMemo(() => {
    return (promptsQuery.data || [])
      .slice()
      .sort((a, b) => {
        const aDate = parseDate(a.updated_at || a.created_at || '')
        const bDate = parseDate(b.updated_at || b.created_at || '')
        return bDate.getTime() - aDate.getTime()
      })
      .slice(0, 10)
  }, [promptsQuery.data])

  const timeline = useMemo(() => buildTimeline(lastPrompts, healthQuery.data), [healthQuery.data, lastPrompts])

  const codexHealth = healthQuery.data?.workers?.find((w) => w.provider?.includes('codex'))
  const claudeHealth = healthQuery.data?.workers?.find((w) => w.provider?.includes('claude'))

  return (
    <div className="space-y-6 px-4 pb-12 md:px-8">
      {!isConnected && (
        <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-100">
          <AlertTitle>Configure a conexão</AlertTitle>
          <AlertDescription>
            Defina a URL e token em <button className="underline" onClick={() => navigate('/connect')}>/connect</button> para carregar métricas.
          </AlertDescription>
        </Alert>
      )}
      {promptsQuery.isError && (
        <Alert className="border-red-500/40 bg-red-500/10 text-red-100">
          <AlertTitle>Erro ao buscar prompts</AlertTitle>
          <AlertDescription className="space-y-2">
            <div>{promptsQuery.error instanceof Error ? promptsQuery.error.message : 'Falha ao contatar a API de prompts.'}</div>
            <Button size="sm" variant="outline" onClick={() => promptsQuery.refetch()}>Tentar novamente</Button>
          </AlertDescription>
        </Alert>
      )}
      {healthQuery.isError && (
        <Alert className="border-red-500/40 bg-red-500/10 text-red-100">
          <AlertTitle>Erro ao consultar /health</AlertTitle>
          <AlertDescription className="space-y-2">
            <div>{healthQuery.error instanceof Error ? healthQuery.error.message : 'Não foi possível obter o status dos workers.'}</div>
            <Button size="sm" variant="outline" onClick={() => healthQuery.refetch()}>Recarregar</Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.1em] text-blue-200">Night Worker</p>
          <h1 className="text-3xl font-bold text-foreground">Painel de Operações</h1>
          <p className="text-sm text-muted-foreground">Monitoramento em tempo real dos workers Claude e Codex.</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className={`flex items-center gap-2 rounded-full px-3 py-1.5 ${
              healthQuery.data?.status === 'ok'
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
                : 'border-red-500/50 bg-red-500/10 text-red-200'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-current shadow-[0_0_0_4px_rgba(34,197,94,0.25)]" />
            {healthQuery.data?.status === 'ok' ? 'Conectado' : 'Verificar conexão'}
          </Badge>
          <Button variant="outline" size="icon" onClick={() => navigate('/settings')}>
            <Settings2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Pendentes" value={stats.pending} hint="Na fila de input/" icon={Clock3} accent="yellow" />
        <MetricCard title="Processados Hoje" value={stats.processedToday} hint="Sucesso nas últimas 24h" icon={CheckCircle2} accent="green" />
        <MetricCard title="Falhas" value={stats.failures} hint="Com backoff ativo" icon={AlertCircle} accent="red" />
        <MetricCard title="Workers Ativos" value={stats.activeWorkers} hint="Claude / Codex" icon={Cpu} accent="blue" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <WorkerCard
          title="Claude Worker"
          config={config.workers.claude}
          queue={claudeHealth?.queue}
          lastRun={claudeHealth?.lastRun}
          nextRetry={claudeHealth?.window}
        />
        <WorkerCard
          title="Codex Worker"
          config={config.workers.codex}
          queue={codexHealth?.queue}
          lastRun={codexHealth?.lastRun}
          nextRetry={codexHealth?.window}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border border-white/10 bg-card/60 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Últimos Prompts</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/prompts')}>
              Ver todos
            </Button>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-border/70 bg-background/50 shadow-inner">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60">
                    <TableHead>Status</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading && lastPrompts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                        Nenhum prompt recente.
                      </TableCell>
                    </TableRow>
                  )}
                  {lastPrompts.map((prompt) => (
                    <TableRow key={prompt.id} className="border-border/60">
                      <TableCell>
                        <StatusBadge status={prompt.status} pulse={prompt.status === 'pending'} />
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">{prompt.name}</TableCell>
                      <TableCell>
                        <ProviderBadge provider={prompt.provider} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatHour(prompt.updated_at || prompt.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/prompts/${prompt.id}`)}>
                          Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-white/10 bg-card/60 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Atividade Recente</CardTitle>
            <Badge variant="outline" className="rounded-full border-border/60 bg-background/40 text-xs">
              Polling 10s
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative pl-4">
              <div className="absolute left-1 top-2 bottom-2 w-px bg-border/60" aria-hidden />
              <ul className="space-y-4">
                {timeline.map((item, idx) => (
                  <li key={idx} className="relative pl-4">
                    <span
                      className={`absolute left-[-9px] top-2 h-3 w-3 rounded-full border-2 ${
                        item.color === 'green'
                          ? 'border-emerald-500 bg-emerald-500/30'
                          : item.color === 'red'
                            ? 'border-red-500 bg-red-500/30'
                            : 'border-blue-500 bg-blue-500/30'
                      }`}
                      aria-hidden
                    />
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function parseDate(value: string) {
  if (!value) return new Date(0)
  const parsed = parseISO(value)
  if (Number.isNaN(parsed.getTime())) return new Date(value)
  return parsed
}

function formatHour(value?: string) {
  if (!value) return '—'
  const d = parseDate(value)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function buildTimeline(prompts: PromptItem[], health?: HealthResponse) {
  const items = prompts.slice(0, 5).map((p) => {
    const baseTime = formatHour(p.updated_at || p.created_at)
    if (p.status === 'done') {
      return { title: `Prompt ${p.name} processado com sucesso`, time: baseTime, color: 'green' as const }
    }
    if (p.status === 'failed') {
      return { title: `Prompt ${p.name} falhou - retry em 5min`, time: baseTime, color: 'red' as const }
    }
    return { title: `Prompt ${p.name} aguardando`, time: baseTime, color: 'blue' as const }
  })

  if (items.length < 5 && health?.workers) {
    health.workers.slice(0, 2).forEach((w) => {
      items.push({
        title: `Worker ${w.provider} ${w.active ? 'iniciado' : 'parado'}`,
        time: w.lastRun ? formatHour(w.lastRun) : 'agora',
        color: w.active ? 'green' as const : 'red' as const,
      })
    })
  }

  return items.slice(0, 5)
}
