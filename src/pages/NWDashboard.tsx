import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { parseISO } from 'date-fns'
import { Activity, AlertCircle, CheckCircle2, Clock3, Cpu, Settings2, TimerReset, TrendingUp } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { MetricCard } from '@/components/night-worker/MetricCard'
import { ProviderBadge } from '@/components/night-worker/ProviderBadge'
import { StatusBadge } from '@/components/night-worker/StatusBadge'
import { WorkerCard } from '@/components/night-worker/WorkerCard'
import { ApiError, useNightWorker } from '@/contexts/NightWorkerContext'
import { useHealthQuery, useProjectsQuery, usePromptsQuery } from '@/hooks/useNightWorkerApi'
import { usePagePerf } from '@/hooks/usePagePerf'
import type { HealthResponse, PromptItem } from '@/types/night-worker'

const DAY_MS = 24 * 60 * 60 * 1000

interface ProjectMetricRow {
  key: string
  projectName: string
  total: number
  active: number
  done: number
  failed: number
  successRate: number | null
  avgLeadMs: number | null
  avgProcessingMs: number | null
  lastUpdatedTs: number
}

interface ProviderMetricRow {
  provider: string
  total: number
  active: number
  done: number
  failed: number
  successRate: number | null
  avgLeadMs: number | null
  avgProcessingMs: number | null
}

interface DashboardData {
  queueActive: number
  done24h: number
  failed24h: number
  failureRate24h: number | null
  activeWorkers: number
  avgLeadMs: number | null
  avgProcessingMs: number | null
  p95ProcessingMs: number | null
  oldestQueueAgeMs: number | null
  activePipelines: number
  projectRows: ProjectMetricRow[]
  providerRows: ProviderMetricRow[]
  lastPrompts: PromptItem[]
}

export default function NWDashboard() {
  usePagePerf('NWDashboard')

  const healthQuery = useHealthQuery()
  const promptsQuery = usePromptsQuery(10000)
  const { data: projects = [] } = useProjectsQuery('all')
  const { config, isConnected } = useNightWorker()
  const navigate = useNavigate()
  const isHealthNotFound = healthQuery.error instanceof ApiError && healthQuery.error.status === 404

  useEffect(() => {
    if (!import.meta.env.DEV) return
    console.info('[NightWorker][Dashboard] state', {
      isConnected,
      healthStatus: healthQuery.data?.status,
      healthError: healthQuery.error ? String(healthQuery.error) : null,
      promptsCount: promptsQuery.data?.length ?? 0,
      promptsError: promptsQuery.error ? String(promptsQuery.error) : null,
    })
  }, [healthQuery.data?.status, healthQuery.error, promptsQuery.data?.length, promptsQuery.error, isConnected])

  const metrics = useMemo<DashboardData>(() => {
    const prompts = promptsQuery.data ?? []
    const now = Date.now()

    const queue = prompts.filter((item) => item.status === 'pending' || item.status === 'processing')
    const done24h = prompts.filter((item) => item.status === 'done' && now - toTs(item.updated_at || item.created_at) <= DAY_MS).length
    const failed24h = prompts.filter((item) => item.status === 'failed' && now - toTs(item.updated_at || item.created_at) <= DAY_MS).length

    const completed = prompts.filter((item) => item.status === 'done' || item.status === 'failed')
    const leadDurations = completed
      .map((item) => duration(item.created_at, item.updated_at || item.created_at))
      .filter((value): value is number => value !== null)
    const processingDurations = completed
      .map((item) => duration(item.processing_started_at, item.updated_at || item.created_at))
      .filter((value): value is number => value !== null)

    const projectNames = new Map(projects.map((project) => [project.id, project.name]))
    const groupedByProject = new Map<string, PromptItem[]>()

    for (const prompt of prompts) {
      const key = prompt.project_id ?? '__none__'
      const list = groupedByProject.get(key) ?? []
      list.push(prompt)
      groupedByProject.set(key, list)
    }

    const projectRows: ProjectMetricRow[] = Array.from(groupedByProject.entries())
      .map(([key, list]) => {
        const done = list.filter((item) => item.status === 'done').length
        const failed = list.filter((item) => item.status === 'failed').length
        const active = list.filter((item) => item.status === 'pending' || item.status === 'processing').length
        const completedInProject = list.filter((item) => item.status === 'done' || item.status === 'failed')
        const lead = completedInProject
          .map((item) => duration(item.created_at, item.updated_at || item.created_at))
          .filter((value): value is number => value !== null)
        const processing = completedInProject
          .map((item) => duration(item.processing_started_at, item.updated_at || item.created_at))
          .filter((value): value is number => value !== null)
        const successBase = done + failed
        const lastUpdatedTs = list.reduce((latest, item) => {
          const ts = toTs(item.updated_at || item.created_at)
          return ts > latest ? ts : latest
        }, 0)

        return {
          key,
          projectName: key === '__none__' ? 'Sem projeto' : projectNames.get(key) ?? `Projeto ${key.slice(0, 8)}`,
          total: list.length,
          active,
          done,
          failed,
          successRate: successBase > 0 ? done / successBase : null,
          avgLeadMs: average(lead),
          avgProcessingMs: average(processing),
          lastUpdatedTs,
        }
      })
      .sort((a, b) => b.total - a.total || b.lastUpdatedTs - a.lastUpdatedTs)

    const groupedByProvider = new Map<string, PromptItem[]>()
    for (const prompt of prompts) {
      const key = prompt.provider || 'unknown'
      const list = groupedByProvider.get(key) ?? []
      list.push(prompt)
      groupedByProvider.set(key, list)
    }

    const providerRows: ProviderMetricRow[] = Array.from(groupedByProvider.entries())
      .map(([provider, list]) => {
        const done = list.filter((item) => item.status === 'done').length
        const failed = list.filter((item) => item.status === 'failed').length
        const active = list.filter((item) => item.status === 'pending' || item.status === 'processing').length
        const completedByProvider = list.filter((item) => item.status === 'done' || item.status === 'failed')
        const lead = completedByProvider
          .map((item) => duration(item.created_at, item.updated_at || item.created_at))
          .filter((value): value is number => value !== null)
        const processing = completedByProvider
          .map((item) => duration(item.processing_started_at, item.updated_at || item.created_at))
          .filter((value): value is number => value !== null)
        const successBase = done + failed

        return {
          provider,
          total: list.length,
          active,
          done,
          failed,
          successRate: successBase > 0 ? done / successBase : null,
          avgLeadMs: average(lead),
          avgProcessingMs: average(processing),
        }
      })
      .sort((a, b) => b.total - a.total)

    const pipelines = new Map<string, PromptItem[]>()
    for (const prompt of prompts) {
      if (!prompt.pipeline_id) continue
      const list = pipelines.get(prompt.pipeline_id) ?? []
      list.push(prompt)
      pipelines.set(prompt.pipeline_id, list)
    }

    const activePipelines = Array.from(pipelines.values()).filter((list) =>
      list.some((item) => item.status === 'pending' || item.status === 'processing'),
    ).length

    const lastPrompts = prompts
      .slice()
      .sort((a, b) => toTs(b.updated_at || b.created_at) - toTs(a.updated_at || a.created_at))
      .slice(0, 10)

    const activeWorkers =
      healthQuery.data?.workers?.filter((worker) => worker.active).length ??
      ['claude', 'codex'].filter((worker) => config.workers[worker as 'claude' | 'codex'].active).length

    return {
      queueActive: queue.length,
      done24h,
      failed24h,
      failureRate24h: done24h + failed24h > 0 ? failed24h / (done24h + failed24h) : null,
      activeWorkers,
      avgLeadMs: average(leadDurations),
      avgProcessingMs: average(processingDurations),
      p95ProcessingMs: percentile(processingDurations, 95),
      oldestQueueAgeMs: queue.length > 0 ? Math.max(...queue.map((item) => Math.max(0, now - toTs(item.created_at)))) : null,
      activePipelines,
      projectRows,
      providerRows,
      lastPrompts,
    }
  }, [config.workers, healthQuery.data?.workers, projects, promptsQuery.data])

  const timeline = useMemo(() => buildTimeline(metrics.lastPrompts, healthQuery.data), [healthQuery.data, metrics.lastPrompts])

  const codexHealth = healthQuery.data?.workers?.find((worker) => worker.provider?.includes('codex'))
  const claudeHealth = healthQuery.data?.workers?.find((worker) => worker.provider?.includes('claude'))

  return (
    <div className="space-y-6 px-4 pb-12 md:px-8">
      {!isConnected && (
        <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-100">
          <AlertTitle>Configure a conexao</AlertTitle>
          <AlertDescription>
            Defina a URL e token em{' '}
            <button className="underline" onClick={() => navigate('/nw/connect')}>
              /connect
            </button>{' '}
            para carregar metricas.
          </AlertDescription>
        </Alert>
      )}

      {promptsQuery.isError && (
        <Alert className="border-red-500/40 bg-red-500/10 text-red-100">
          <AlertTitle>Erro ao buscar prompts</AlertTitle>
          <AlertDescription className="space-y-2">
            <div>{promptsQuery.error instanceof Error ? promptsQuery.error.message : 'Falha ao contatar a API de prompts.'}</div>
            <Button size="sm" variant="outline" onClick={() => promptsQuery.refetch()}>
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {healthQuery.isError && !isHealthNotFound && (
        <Alert className="border-red-500/40 bg-red-500/10 text-red-100">
          <AlertTitle>Erro ao consultar /health</AlertTitle>
          <AlertDescription className="space-y-2">
            <div>{healthQuery.error instanceof Error ? healthQuery.error.message : 'Nao foi possivel obter o status dos workers.'}</div>
            <Button size="sm" variant="outline" onClick={() => healthQuery.refetch()}>
              Recarregar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.1em] text-blue-200">Night Worker</p>
          <h1 className="text-3xl font-bold text-foreground">Dashboard de Metricas</h1>
          <p className="text-sm text-muted-foreground">Fila, tempos de execucao, providers e performance por projeto.</p>
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
            {healthQuery.data?.status === 'ok' ? 'Conectado' : 'Verificar conexao'}
          </Badge>
          <Button variant="outline" onClick={() => navigate('/nw/projects')}>
            Projetos
          </Button>
          <Button variant="outline" onClick={() => navigate('/nw/templates')}>
            Templates
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigate('/nw/settings')}>
            <Settings2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Fila ativa" value={metrics.queueActive} hint="Pendentes + processando" icon={Clock3} accent="yellow" />
        <MetricCard title="Done 24h" value={metrics.done24h} hint="Concluidos nas ultimas 24h" icon={CheckCircle2} accent="green" />
        <MetricCard title="Falhas 24h" value={metrics.failed24h} hint={`Taxa: ${formatPercent(metrics.failureRate24h)}`} icon={AlertCircle} accent="red" />
        <MetricCard title="Workers ativos" value={metrics.activeWorkers} hint="Claude e Codex" icon={Cpu} accent="blue" />
        <MetricCard title="Tempo medio total" value={formatDuration(metrics.avgLeadMs)} hint="Criacao ate update" icon={TimerReset} accent="purple" />
        <MetricCard title="Tempo medio proc" value={formatDuration(metrics.avgProcessingMs)} hint="processing_started_at ate fim" icon={Activity} accent="blue" />
        <MetricCard title="P95 processamento" value={formatDuration(metrics.p95ProcessingMs)} hint="Cauda de latencia" icon={TrendingUp} accent="purple" />
        <MetricCard title="Pipelines ativos" value={metrics.activePipelines} hint={`Item mais antigo: ${formatDuration(metrics.oldestQueueAgeMs)}`} icon={Cpu} accent="yellow" />
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

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border border-white/10 bg-card/70 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Metricas por projeto</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/nw/projects')}>
              Abrir projetos
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-xl border border-border/70 bg-background/50 shadow-inner">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60">
                    <TableHead>Projeto</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Ativos</TableHead>
                    <TableHead>Done</TableHead>
                    <TableHead>Falhas</TableHead>
                    <TableHead>Sucesso</TableHead>
                    <TableHead>T. total</TableHead>
                    <TableHead>T. proc</TableHead>
                    <TableHead>Ultima atividade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.projectRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="py-6 text-center text-muted-foreground">
                        Nenhum dado de projeto.
                      </TableCell>
                    </TableRow>
                  )}
                  {metrics.projectRows.map((row) => (
                    <TableRow key={row.key} className="border-border/60">
                      <TableCell className="font-semibold text-foreground">{row.projectName}</TableCell>
                      <TableCell>{row.total}</TableCell>
                      <TableCell>{row.active}</TableCell>
                      <TableCell>{row.done}</TableCell>
                      <TableCell>{row.failed}</TableCell>
                      <TableCell>{formatPercent(row.successRate)}</TableCell>
                      <TableCell>{formatDuration(row.avgLeadMs)}</TableCell>
                      <TableCell>{formatDuration(row.avgProcessingMs)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDateTime(row.lastUpdatedTs)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-white/10 bg-card/70 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Metricas por provider</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/nw/prompts')}>
              Abrir prompts
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-xl border border-border/70 bg-background/50 shadow-inner">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60">
                    <TableHead>Provider</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Ativos</TableHead>
                    <TableHead>Done</TableHead>
                    <TableHead>Falhas</TableHead>
                    <TableHead>Sucesso</TableHead>
                    <TableHead>T. total</TableHead>
                    <TableHead>T. proc</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.providerRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-6 text-center text-muted-foreground">
                        Sem dados de provider.
                      </TableCell>
                    </TableRow>
                  )}
                  {metrics.providerRows.map((row) => (
                    <TableRow key={row.provider} className="border-border/60">
                      <TableCell>
                        <ProviderBadge provider={row.provider} />
                      </TableCell>
                      <TableCell>{row.total}</TableCell>
                      <TableCell>{row.active}</TableCell>
                      <TableCell>{row.done}</TableCell>
                      <TableCell>{row.failed}</TableCell>
                      <TableCell>{formatPercent(row.successRate)}</TableCell>
                      <TableCell>{formatDuration(row.avgLeadMs)}</TableCell>
                      <TableCell>{formatDuration(row.avgProcessingMs)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
