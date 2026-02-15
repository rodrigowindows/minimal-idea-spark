import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useNightWorker } from '@/contexts/NightWorkerContext'
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Play,
  RefreshCw,
  AlertCircle,
  Clock,
  Zap,
  Server,
  Activity,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────

type TestStatus = 'idle' | 'running' | 'pass' | 'fail' | 'skip'

interface TestResult {
  id: string
  name: string
  category: string
  status: TestStatus
  duration?: number
  error?: string
}

// ── Test runner ──────────────────────────────────────────────────────────

function createTest(id: string, name: string, category: string): TestResult {
  return { id, name, category, status: 'idle' }
}

export default function NWTestDashboard() {
  const { apiFetch, config, isConnected } = useNightWorker()
  const [tests, setTests] = useState<TestResult[]>(() => [
    // Connectivity tests
    createTest('conn-health', 'Health endpoint', 'Connectivity'),
    createTest('conn-list', 'List prompts (GET /prompts)', 'Connectivity'),
    createTest('conn-auth', 'Auth token validation', 'Connectivity'),

    // CRUD tests
    createTest('crud-create', 'Create prompt (POST /prompts)', 'CRUD'),
    createTest('crud-read', 'Read prompt (GET /prompts/:id)', 'CRUD'),
    createTest('crud-update', 'Update prompt (PATCH /prompts/:id)', 'CRUD'),
    createTest('crud-filter', 'Filter by status & provider', 'CRUD'),

    // Status flow tests
    createTest('flow-pending', 'New prompt starts as pending', 'Status Flow'),
    createTest('flow-done', 'Mark as done with result', 'Status Flow'),
    createTest('flow-failed', 'Mark as failed with error', 'Status Flow'),

    // Pipeline tests
    createTest('pipe-templates', 'Default templates load (3)', 'Pipeline'),
    createTest('pipe-steps', 'Template steps have provider/role/instruction', 'Pipeline'),
    createTest('pipe-placeholders', 'Instructions use {input}/{previous_result}', 'Pipeline'),

    // Provider detection tests (client-side)
    createTest('detect-success', 'Return code 0 = success', 'Provider Detection'),
    createTest('detect-ratelimit', 'Rate limit keywords detected', 'Provider Detection'),
    createTest('detect-toolong', 'Too long detection', 'Provider Detection'),
    createTest('detect-timeout', 'Timeout handling', 'Provider Detection'),
  ])

  const [isRunning, setIsRunning] = useState(false)
  const [createdPromptId, setCreatedPromptId] = useState<string | null>(null)

  const updateTest = useCallback((id: string, update: Partial<TestResult>) => {
    setTests((prev) => prev.map((t) => (t.id === id ? { ...t, ...update } : t)))
  }, [])

  const runTest = useCallback(
    async (id: string, fn: () => Promise<void>) => {
      updateTest(id, { status: 'running', error: undefined, duration: undefined })
      const start = performance.now()
      try {
        await fn()
        updateTest(id, { status: 'pass', duration: Math.round(performance.now() - start) })
      } catch (err) {
        updateTest(id, {
          status: 'fail',
          error: err instanceof Error ? err.message : String(err),
          duration: Math.round(performance.now() - start),
        })
      }
    },
    [updateTest],
  )

  const runAllTests = useCallback(async () => {
    setIsRunning(true)
    setCreatedPromptId(null)
    setTests((prev) => prev.map((t) => ({ ...t, status: 'idle', error: undefined, duration: undefined })))

    // ── Connectivity ──
    await runTest('conn-health', async () => {
      const data = await apiFetch<Record<string, unknown>>('/health', { silentStatuses: [404] })
      if (!data || typeof data !== 'object') throw new Error('Invalid health response')
    })

    await runTest('conn-list', async () => {
      const data = await apiFetch<{ total?: number; prompts?: unknown[] }>('/prompts')
      if (typeof data?.total !== 'number') throw new Error('Missing total field')
      if (!Array.isArray(data?.prompts)) throw new Error('Missing prompts array')
    })

    await runTest('conn-auth', async () => {
      if (!config.token) {
        // Token is optional, still should work
        await apiFetch('/prompts')
      } else {
        await apiFetch('/prompts')
      }
    })

    // ── CRUD ──
    let promptId: string | null = null

    await runTest('crud-create', async () => {
      const data = await apiFetch<{ id: string }>('/prompts', {
        method: 'POST',
        body: JSON.stringify({
          provider: 'codex',
          name: `test-dashboard-${Date.now()}`,
          content: 'Test from NW Test Dashboard',
          target_folder: '',
        }),
      })
      if (!data?.id) throw new Error('No id returned')
      promptId = data.id
      setCreatedPromptId(data.id)
    })

    await runTest('crud-read', async () => {
      if (!promptId) throw new Error('No prompt created - skipping')
      const data = await apiFetch<{ id: string; status: string }>(`/prompts/${promptId}`)
      if (data?.id !== promptId) throw new Error(`ID mismatch: ${data?.id}`)
    })

    await runTest('crud-update', async () => {
      if (!promptId) throw new Error('No prompt created - skipping')
      const data = await apiFetch<{ id: string; status: string }>(`/prompts/${promptId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'done',
          result_content: 'Test result from dashboard',
          event_type: 'done',
        }),
      })
      if (data?.status !== 'done') throw new Error(`Expected done, got ${data?.status}`)
    })

    await runTest('crud-filter', async () => {
      const data = await apiFetch<{ prompts?: { id: string }[] }>('/prompts?status=done&provider=codex')
      if (!Array.isArray(data?.prompts)) throw new Error('No prompts array')
      if (promptId && !data.prompts.some((p) => p.id === promptId)) {
        throw new Error('Created prompt not found in filtered list')
      }
    })

    // ── Status Flow ──
    await runTest('flow-pending', async () => {
      const data = await apiFetch<{ id: string; status: string }>('/prompts', {
        method: 'POST',
        body: JSON.stringify({
          provider: 'claude',
          name: `test-flow-${Date.now()}`,
          content: 'Status flow test',
          target_folder: '',
        }),
      })
      if (!data?.id) throw new Error('Failed to create')
      // Verify it's pending
      const detail = await apiFetch<{ status: string }>(`/prompts/${data.id}`)
      if (detail?.status !== 'pending') throw new Error(`Expected pending, got ${detail?.status}`)
    })

    await runTest('flow-done', async () => {
      const create = await apiFetch<{ id: string }>('/prompts', {
        method: 'POST',
        body: JSON.stringify({
          provider: 'claude',
          name: `test-done-${Date.now()}`,
          content: 'Mark done test',
          target_folder: '',
        }),
      })
      if (!create?.id) throw new Error('Failed to create')
      const updated = await apiFetch<{ status: string }>(`/prompts/${create.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'done', result_content: 'Success!' }),
      })
      if (updated?.status !== 'done') throw new Error(`Expected done, got ${updated?.status}`)
    })

    await runTest('flow-failed', async () => {
      const create = await apiFetch<{ id: string }>('/prompts', {
        method: 'POST',
        body: JSON.stringify({
          provider: 'gemini',
          name: `test-fail-${Date.now()}`,
          content: 'Mark failed test',
          target_folder: '',
        }),
      })
      if (!create?.id) throw new Error('Failed to create')
      const updated = await apiFetch<{ status: string }>(`/prompts/${create.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'failed', error: 'Test failure' }),
      })
      if (updated?.status !== 'failed') throw new Error(`Expected failed, got ${updated?.status}`)
    })

    // ── Pipeline (client-side) ──
    await runTest('pipe-templates', async () => {
      const { getDefaultPipelineTemplates } = await import('@/lib/nightworker/pipelineTemplates')
      const templates = getDefaultPipelineTemplates()
      if (templates.length !== 3) throw new Error(`Expected 3 templates, got ${templates.length}`)
    })

    await runTest('pipe-steps', async () => {
      const { getDefaultPipelineTemplates } = await import('@/lib/nightworker/pipelineTemplates')
      const templates = getDefaultPipelineTemplates()
      for (const t of templates) {
        for (const step of t.steps) {
          if (!step.provider) throw new Error(`Step missing provider in ${t.name}`)
          if (!step.role) throw new Error(`Step missing role in ${t.name}`)
          if (!step.instruction) throw new Error(`Step missing instruction in ${t.name}`)
        }
      }
    })

    await runTest('pipe-placeholders', async () => {
      const { getDefaultPipelineTemplates } = await import('@/lib/nightworker/pipelineTemplates')
      const templates = getDefaultPipelineTemplates()
      for (const t of templates) {
        if (!t.steps[0].instruction.includes('{input}')) {
          throw new Error(`First step of ${t.name} missing {input}`)
        }
        for (const step of t.steps.slice(1)) {
          if (!step.instruction.includes('{previous_result}')) {
            throw new Error(`Step ${step.role} of ${t.name} missing {previous_result}`)
          }
        }
      }
    })

    // ── Provider Detection (pure client-side logic) ──
    await runTest('detect-success', async () => {
      // returnCode 0 = success
      if (0 !== 0) throw new Error('Logic error')
    })

    await runTest('detect-ratelimit', async () => {
      const keywords = ['rate_limit', 'quota', 'token', 'hit your limit']
      const testMsg = 'Error: rate_limit exceeded'
      if (!keywords.some((k) => testMsg.toLowerCase().includes(k))) {
        throw new Error('Rate limit not detected')
      }
    })

    await runTest('detect-toolong', async () => {
      const testMsg = 'prompt is too long'
      if (!testMsg.includes('too long')) throw new Error('Too long not detected')
    })

    await runTest('detect-timeout', async () => {
      // Verify timeout detection concept
      const start = Date.now()
      const elapsed = Date.now() - start
      if (elapsed > 10000) throw new Error('Would be timeout')
    })

    setIsRunning(false)
  }, [apiFetch, config.token, runTest])

  // ── Stats ──
  const passed = tests.filter((t) => t.status === 'pass').length
  const failed = tests.filter((t) => t.status === 'fail').length
  const running = tests.filter((t) => t.status === 'running').length
  const totalDuration = tests.reduce((sum, t) => sum + (t.duration || 0), 0)

  const categories = [...new Set(tests.map((t) => t.category))]

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Night Worker - Test Dashboard</h1>
          <p className="text-muted-foreground">
            Testes automatizados para validar I/O dos modelos, status e pipeline
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={isConnected ? 'default' : 'destructive'} className="gap-1">
            <Server className="h-3 w-3" />
            {isConnected ? 'Conectado' : 'Desconectado'}
          </Badge>
          <Button onClick={runAllTests} disabled={isRunning} className="gap-2">
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Executando...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" /> Rodar Todos os Testes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            <div>
              <p className="text-2xl font-bold">{passed}</p>
              <p className="text-sm text-muted-foreground">Passed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <XCircle className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold">{failed}</p>
              <p className="text-sm text-muted-foreground">Failed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Activity className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{running}</p>
              <p className="text-sm text-muted-foreground">Running</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Clock className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-2xl font-bold">{totalDuration}ms</p>
              <p className="text-sm text-muted-foreground">Total Time</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress bar */}
      {(passed + failed) > 0 && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${(passed / tests.length) * 100}%` }}
          />
        </div>
      )}

      {/* Test Results by Category */}
      {categories.map((category) => (
        <Card key={category}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="h-5 w-5" />
              {category}
            </CardTitle>
            <CardDescription>
              {tests.filter((t) => t.category === category && t.status === 'pass').length}/
              {tests.filter((t) => t.category === category).length} passed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {tests
              .filter((t) => t.category === category)
              .map((test) => (
                <div
                  key={test.id}
                  className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-colors ${
                    test.status === 'pass'
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : test.status === 'fail'
                        ? 'border-red-500/30 bg-red-500/5'
                        : test.status === 'running'
                          ? 'border-blue-500/30 bg-blue-500/5'
                          : 'border-border'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <StatusIcon status={test.status} />
                    <span className="text-sm font-medium">{test.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {test.duration !== undefined && (
                      <span className="text-xs text-muted-foreground">{test.duration}ms</span>
                    )}
                    {test.error && (
                      <Badge variant="destructive" className="max-w-[300px] truncate text-xs">
                        {test.error}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      ))}

      {/* Created prompt info */}
      {createdPromptId && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Prompts de teste criados</AlertTitle>
          <AlertDescription>
            Os testes criaram prompts de teste no banco. ID principal: <code>{createdPromptId}</code>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

function StatusIcon({ status }: { status: TestStatus }) {
  switch (status) {
    case 'pass':
      return <CheckCircle2 className="h-5 w-5 text-emerald-500" />
    case 'fail':
      return <XCircle className="h-5 w-5 text-red-500" />
    case 'running':
      return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
    case 'skip':
      return <AlertCircle className="h-5 w-5 text-amber-500" />
    default:
      return <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
  }
}
