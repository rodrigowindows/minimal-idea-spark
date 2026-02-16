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
