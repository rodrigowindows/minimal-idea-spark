/**
 * Tests for useNightWorkerApi hooks.
 * Covers: normalizePromptItem, normalizeProjectItem, and key hooks
 * using mocked NightWorkerContext and React Query.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// We need to test the normalize functions which are not exported,
// so we replicate their logic here as pure-function tests.
// The hooks themselves need the NightWorkerContext.

// ── Mock NightWorkerContext ─────────────────────────────────────────────

const mockApiFetch = vi.fn()

vi.mock('@/contexts/NightWorkerContext', () => ({
  useNightWorker: () => ({
    apiFetch: mockApiFetch,
    config: { baseUrl: 'http://localhost:7777' },
    isConnected: true,
  }),
  ApiError: class ApiError extends Error {
    status?: number
    constructor(message: string, status?: number) {
      super(message)
      this.status = status
    }
  },
}))

// Import hooks AFTER mock
import {
  useHealthQuery,
  usePromptsQuery,
  usePromptStatusQuery,
  usePipelinePromptsQuery,
  useProjectsQuery,
  useProjectPromptsQuery,
  useTemplatesQuery,
  useCreateTemplateMutation,
  useUpdateTemplateMutation,
  useDeleteTemplateMutation,
  useCreatePromptMutation,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useMovePromptMutation,
  useReorderPrioritizedMutation,
  useEditPromptMutation,
  useReprocessPromptMutation,
  useLogsQuery,
} from '@/hooks/useNightWorkerApi'
import { ApiError } from '@/contexts/NightWorkerContext'
import { normalizeTemplateItem } from '@/hooks/night-worker/shared'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity, gcTime: 0 },
      mutations: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

// ══════════════════════════════════════════════════════════════════════════
// normalizePromptItem (tested indirectly via hooks)
// ══════════════════════════════════════════════════════════════════════════

describe('normalizePromptItem (via usePromptsQuery)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('normaliza resposta completa corretamente', async () => {
    mockApiFetch.mockResolvedValueOnce([
      {
        id: 'p1',
        name: 'test-prompt',
        provider: 'claude',
        status: 'done',
        content: 'hello',
        target_folder: '/tmp',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T01:00:00Z',
        pipeline_id: 'pipe-1',
        pipeline_step: 1,
        pipeline_total_steps: 3,
        project_id: 'proj-1',
      },
    ])

    const { result } = renderHook(() => usePromptsQuery(30000, { enabled: true }), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const item = result.current.data![0]
    expect(item.id).toBe('p1')
    expect(item.name).toBe('test-prompt')
    expect(item.provider).toBe('claude')
    expect(item.status).toBe('done')
    expect(item.pipeline_id).toBe('pipe-1')
    expect(item.project_id).toBe('proj-1')
  })

  it('preenche defaults para campos ausentes', async () => {
    mockApiFetch.mockResolvedValueOnce([
      { id: 'p2', provider: 'gemini', status: 'pending' },
    ])

    const { result } = renderHook(() => usePromptsQuery(30000, { enabled: true }), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const item = result.current.data![0]
    expect(item.name).toBe('sem-nome')
    expect(item.queue_stage).toBe('prioritized') // pending default
    expect(item.pipeline_id).toBeNull()
    expect(item.project_id).toBeNull()
    expect(item.error).toBeNull()
    expect(item.result_content).toBeNull()
  })

  it('usa filename como fallback para name (remove .txt)', async () => {
    mockApiFetch.mockResolvedValueOnce([
      { id: 'p3', provider: 'codex', status: 'done', filename: 'meu-prompt.txt' },
    ])

    const { result } = renderHook(() => usePromptsQuery(30000, { enabled: true }), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data![0].name).toBe('meu-prompt')
  })

  it('normaliza legacy result e path para result_content e result_path', async () => {
    mockApiFetch.mockResolvedValueOnce([
      { id: 'p4', provider: 'claude', status: 'done', result: 'output text', path: '/results/p4.txt' },
    ])

    const { result } = renderHook(() => usePromptsQuery(30000, { enabled: true }), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data![0].result_content).toBe('output text')
    expect(result.current.data![0].result_path).toBe('/results/p4.txt')
  })

  it('detecta has_result do campo result quando has_result ausente', async () => {
    mockApiFetch.mockResolvedValueOnce([
      { id: 'p5', provider: 'claude', status: 'done', result: 'some output' },
    ])

    const { result } = renderHook(() => usePromptsQuery(30000, { enabled: true }), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data![0].has_result).toBe(true)
  })

  it('aceita formato { prompts: [...] } da API', async () => {
    mockApiFetch.mockResolvedValueOnce({
      total: 2,
      prompts: [
        { id: 'a1', provider: 'claude', status: 'done' },
        { id: 'a2', provider: 'gemini', status: 'pending' },
      ],
    })

    const { result } = renderHook(() => usePromptsQuery(30000, { enabled: true }), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(2)
    expect(result.current.data![0].id).toBe('a1')
    expect(result.current.data![1].id).toBe('a2')
  })

  it('normaliza template_id e template_version', async () => {
    mockApiFetch.mockResolvedValueOnce([
      { id: 'p-tpl', provider: 'claude', status: 'done', template_id: 'tpl-1', template_version: 3 },
    ])

    const { result } = renderHook(() => usePromptsQuery(30000, { enabled: true }), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data![0].template_id).toBe('tpl-1')
    expect(result.current.data![0].template_version).toBe(3)
  })

  it('normaliza queue_stage para pending como "prioritized"', async () => {
    mockApiFetch.mockResolvedValueOnce([
      { id: 'p-qs1', provider: 'claude', status: 'pending' },
      { id: 'p-qs2', provider: 'claude', status: 'done', queue_stage: 'backlog' },
    ])

    const { result } = renderHook(() => usePromptsQuery(30000, { enabled: true }), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data![0].queue_stage).toBe('prioritized')
    expect(result.current.data![1].queue_stage).toBe('backlog')
  })

  it('normaliza processing_started_at e worker_id', async () => {
    mockApiFetch.mockResolvedValueOnce([
      {
        id: 'p-worker',
        provider: 'codex',
        status: 'processing',
        processing_started_at: '2026-02-16T12:00:00Z',
        worker_id: 'worker-01',
      },
    ])

    const { result } = renderHook(() => usePromptsQuery(30000, { enabled: true }), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data![0].processing_started_at).toBe('2026-02-16T12:00:00Z')
    expect(result.current.data![0].worker_id).toBe('worker-01')
  })
})

// ══════════════════════════════════════════════════════════════════════════
// normalizeProjectItem (via useProjectsQuery)
// ══════════════════════════════════════════════════════════════════════════

describe('normalizeProjectItem (via useProjectsQuery)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('normaliza projeto completo', async () => {
    mockApiFetch.mockResolvedValueOnce({
      projects: [{
        id: 'proj-1',
        name: 'Meu Projeto',
        description: 'Descricao',
        default_target_folder: '/code/proj',
        status: 'active',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-02T00:00:00Z',
        stats: { total: 10, pending: 2, processing: 1, done: 6, failed: 1 },
      }],
    })

    const { result } = renderHook(() => useProjectsQuery('active'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const proj = result.current.data![0]
    expect(proj.id).toBe('proj-1')
    expect(proj.name).toBe('Meu Projeto')
    expect(proj.status).toBe('active')
    expect(proj.stats?.total).toBe(10)
    expect(proj.stats?.failed).toBe(1)
  })

  it('nome padrao e "sem-nome" quando ausente', async () => {
    mockApiFetch.mockResolvedValueOnce([{ id: 'proj-2' }])

    const { result } = renderHook(() => useProjectsQuery('active'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data![0].name).toBe('sem-nome')
  })

  it('status padrao e "active" se nao for "archived" ou "paused"', async () => {
    mockApiFetch.mockResolvedValueOnce([
      { id: 'p1', name: 'A', status: 'archived' },
      { id: 'p2', name: 'B', status: 'paused' },
      { id: 'p3', name: 'C', status: 'whatever' },
      { id: 'p4', name: 'D' },
    ])

    const { result } = renderHook(() => useProjectsQuery('all'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data![0].status).toBe('archived')
    expect(result.current.data![1].status).toBe('paused')
    expect(result.current.data![2].status).toBe('active')
    expect(result.current.data![3].status).toBe('active')
  })

  it('stats sao coercidos para numeros', async () => {
    mockApiFetch.mockResolvedValueOnce([{
      id: 'proj-3',
      name: 'Test',
      stats: { total: '5', pending: '2', processing: '0', done: '3', failed: '0' },
    }])

    const { result } = renderHook(() => useProjectsQuery('active'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const stats = result.current.data![0].stats
    expect(stats?.total).toBe(5)
    expect(typeof stats?.total).toBe('number')
  })

  it('normaliza campos SLA com defaults', async () => {
    mockApiFetch.mockResolvedValueOnce([
      {
        id: 'proj-sla',
        name: 'SLA Test',
        sla_timeout_seconds: 600,
        sla_max_retries: 5,
        sla_retry_delay_seconds: 120,
      },
    ])

    const { result } = renderHook(() => useProjectsQuery('active'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const project = result.current.data![0]
    expect(project.sla_timeout_seconds).toBe(600)
    expect(project.sla_max_retries).toBe(5)
    expect(project.sla_retry_delay_seconds).toBe(120)
  })

  it('usa defaults SLA quando campos ausentes', async () => {
    mockApiFetch.mockResolvedValueOnce([{ id: 'proj-no-sla', name: 'No SLA' }])

    const { result } = renderHook(() => useProjectsQuery('active'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const project = result.current.data![0]
    expect(project.sla_timeout_seconds).toBe(300)
    expect(project.sla_max_retries).toBe(3)
    expect(project.sla_retry_delay_seconds).toBe(60)
  })

  it('coerce SLA strings para numeros', async () => {
    mockApiFetch.mockResolvedValueOnce([
      {
        id: 'proj-sla-str',
        name: 'SLA String',
        sla_timeout_seconds: '450',
        sla_max_retries: '2',
        sla_retry_delay_seconds: '90',
      },
    ])

    const { result } = renderHook(() => useProjectsQuery('active'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const project = result.current.data![0]
    expect(typeof project.sla_timeout_seconds).toBe('number')
    expect(project.sla_timeout_seconds).toBe(450)
    expect(project.sla_max_retries).toBe(2)
    expect(project.sla_retry_delay_seconds).toBe(90)
  })
})

describe('normalizeTemplateItem', () => {
  it('normaliza template completo', () => {
    const item = {
      id: 'tpl-1',
      name: 'My Template',
      description: 'A test template',
      steps: [
        { provider: 'gemini', role: 'validate', instruction: 'Validate:\n{input}' },
        { provider: 'claude', role: 'review', instruction: 'Review:\n{previous_result}' },
      ],
      version: 3,
      is_default: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
    }

    const result = normalizeTemplateItem(item)

    expect(result.id).toBe('tpl-1')
    expect(result.name).toBe('My Template')
    expect(result.description).toBe('A test template')
    expect(result.steps).toHaveLength(2)
    expect(result.version).toBe(3)
    expect(result.is_default).toBe(true)
    expect(result.created_at).toBe('2026-01-01T00:00:00Z')
    expect(result.updated_at).toBe('2026-01-02T00:00:00Z')
  })

  it('preenche defaults para campos ausentes', () => {
    const result = normalizeTemplateItem({ id: 42 })

    expect(result.id).toBe('42')
    expect(result.name).toBe('template')
    expect(result.description).toBe('')
    expect(result.steps).toEqual([])
    expect(result.version).toBe(1)
    expect(result.is_default).toBe(false)
    expect(result.created_at).toBeTruthy()
    expect(result.updated_at).toBeTruthy()
  })

  it('coerce id numerico para string', () => {
    const result = normalizeTemplateItem({ id: 123, name: 'Test' })

    expect(result.id).toBe('123')
    expect(typeof result.id).toBe('string')
  })

  it('steps invalido vira array vazio', () => {
    const result = normalizeTemplateItem({ id: '1', steps: 'not-array' })

    expect(result.steps).toEqual([])
  })

  it('version invalido fallback para 1', () => {
    const result = normalizeTemplateItem({ id: '1', version: 'abc' })

    expect(result.version).toBe(1)
  })

  it('is_default e coercido para boolean', () => {
    const truthy = normalizeTemplateItem({ id: '1', is_default: 1 })
    const falsy = normalizeTemplateItem({ id: '2', is_default: 0 })
    const nullish = normalizeTemplateItem({ id: '3', is_default: null })

    expect(truthy.is_default).toBe(true)
    expect(falsy.is_default).toBe(false)
    expect(nullish.is_default).toBe(false)
  })

  it('updated_at usa created_at como fallback', () => {
    const result = normalizeTemplateItem({
      id: '1',
      created_at: '2026-06-01T00:00:00Z',
    })

    expect(result.updated_at).toBe('2026-06-01T00:00:00Z')
  })
})

// ══════════════════════════════════════════════════════════════════════════
// Hook tests
// ══════════════════════════════════════════════════════════════════════════

describe('useHealthQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna dados de saude quando API responde', async () => {
    mockApiFetch.mockResolvedValueOnce({ status: 'ok', version: '1.0', providers: ['claude'], workers: [] })

    const { result } = renderHook(() => useHealthQuery(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.status).toBe('ok')
    expect(result.current.data?.version).toBe('1.0')
  })

  it('retorna fallback edge no 404', async () => {
    mockApiFetch.mockRejectedValueOnce(new ApiError('Not Found', 404))

    const { result } = renderHook(() => useHealthQuery(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.status).toBe('ok')
    expect(result.current.data?.version).toBe('edge')
  })
})

describe('usePromptStatusQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('busca prompt por id', async () => {
    mockApiFetch.mockResolvedValueOnce({
      id: 'prompt-1',
      provider: 'claude',
      status: 'done',
      name: 'test',
    })

    const { result } = renderHook(() => usePromptStatusQuery('prompt-1'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.id).toBe('prompt-1')
    expect(result.current.data?.status).toBe('done')
  })

  it('desabilitado quando id ausente', () => {
    const { result } = renderHook(() => usePromptStatusQuery(undefined), { wrapper: createWrapper() })

    expect(result.current.fetchStatus).toBe('idle')
  })

  it('fallback para /status no 404', async () => {
    mockApiFetch
      .mockRejectedValueOnce(new ApiError('Not Found', 404))
      .mockResolvedValueOnce({ id: 'prompt-2', provider: 'gemini', status: 'pending' })

    const { result } = renderHook(() => usePromptStatusQuery('prompt-2'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.id).toBe('prompt-2')
    expect(mockApiFetch).toHaveBeenCalledTimes(2)
  })
})

describe('usePipelinePromptsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ordena por pipeline_step e depois por updated_at desc', async () => {
    mockApiFetch.mockResolvedValueOnce([
      { id: 's3', provider: 'claude', status: 'done', pipeline_step: 3, updated_at: '2026-01-01T03:00:00Z' },
      { id: 's1', provider: 'gemini', status: 'done', pipeline_step: 1, updated_at: '2026-01-01T01:00:00Z' },
      { id: 's2', provider: 'codex', status: 'done', pipeline_step: 2, updated_at: '2026-01-01T02:00:00Z' },
    ])

    const { result } = renderHook(() => usePipelinePromptsQuery('pipe-1'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const data = result.current.data!
    expect(data[0].id).toBe('s1')
    expect(data[1].id).toBe('s2')
    expect(data[2].id).toBe('s3')
  })

  it('desabilitado quando pipelineId ausente', () => {
    const { result } = renderHook(() => usePipelinePromptsQuery(null), { wrapper: createWrapper() })
    expect(result.current.fetchStatus).toBe('idle')
  })
})

describe('useProjectPromptsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('busca prompts do projeto', async () => {
    mockApiFetch.mockResolvedValueOnce([
      { id: 'pp1', provider: 'claude', status: 'done' },
      { id: 'pp2', provider: 'gemini', status: 'pending' },
    ])

    const { result } = renderHook(() => useProjectPromptsQuery('proj-1', 10), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(2)
  })

  it('desabilitado quando projectId ausente', () => {
    const { result } = renderHook(() => useProjectPromptsQuery(null), { wrapper: createWrapper() })
    expect(result.current.fetchStatus).toBe('idle')
  })
})

describe('useTemplatesQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna templates normalizados da API', async () => {
    mockApiFetch.mockResolvedValueOnce({
      templates: [
        {
          id: 'tpl-1',
          name: 'Quick',
          description: 'Fast',
          steps: [{ provider: 'gemini', role: 'v', instruction: '{input}' }],
          version: 1,
        },
        { id: 'tpl-2', name: 'Full', description: 'Complete', steps: [], version: 2 },
      ],
    })

    const { result } = renderHook(() => useTemplatesQuery(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(2)
    expect(result.current.data![0].id).toBe('tpl-1')
    expect(result.current.data![1].id).toBe('tpl-2')
  })

  it('aceita formato array direto da API', async () => {
    mockApiFetch.mockResolvedValueOnce([{ id: 'tpl-1', name: 'Test', steps: [], version: 1 }])

    const { result } = renderHook(() => useTemplatesQuery(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(1)
    expect(result.current.data![0].id).toBe('tpl-1')
  })

  it('seed defaults quando API retorna lista vazia', async () => {
    mockApiFetch
      .mockResolvedValueOnce({ templates: [] })
      .mockResolvedValueOnce({ id: 's1' })
      .mockResolvedValueOnce({ id: 's2' })
      .mockResolvedValueOnce({ id: 's3' })
      .mockResolvedValueOnce({
        templates: [
          {
            id: 's1',
            name: 'Quick Validate',
            steps: [{ provider: 'gemini', role: 'v', instruction: '{input}' }],
            version: 1,
          },
          { id: 's2', name: 'Full Pipeline', steps: [], version: 1 },
          { id: 's3', name: 'Deep Review', steps: [], version: 1 },
        ],
      })

    const { result } = renderHook(() => useTemplatesQuery(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data!.length).toBeGreaterThan(0)
    const postCalls = mockApiFetch.mock.calls.filter((call) => call[1]?.method === 'POST')
    expect(postCalls.length).toBe(3)
  })

  it('retorna defaults locais no 404/501', async () => {
    mockApiFetch.mockRejectedValueOnce(new ApiError('Not Found', 404))

    const { result } = renderHook(() => useTemplatesQuery(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data!.length).toBe(3)
    expect(result.current.data![0].name).toBe('Quick Validate')
  })

  it('propaga outros erros normalmente', async () => {
    mockApiFetch.mockRejectedValueOnce(new ApiError('Server Error', 500))

    const { result } = renderHook(() => useTemplatesQuery(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeTruthy()
  })
})

describe('useCreatePromptMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('envia POST com body correto', async () => {
    mockApiFetch.mockResolvedValueOnce({ id: 'new-1' })

    const { result } = renderHook(() => useCreatePromptMutation(), { wrapper: createWrapper() })

    await result.current.mutateAsync({
      provider: 'claude',
      name: 'test-create',
      content: 'do something',
      target_folder: '/tmp',
    })

    expect(mockApiFetch).toHaveBeenCalledWith('/prompts', expect.objectContaining({
      method: 'POST',
    }))

    const body = JSON.parse(mockApiFetch.mock.calls[0][1].body)
    expect(body.provider).toBe('claude')
    expect(body.name).toBe('test-create')
  })
})

describe('useCreateProjectMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('envia POST para /projects com body correto', async () => {
    mockApiFetch.mockResolvedValueOnce({ id: 'proj-new', name: 'Novo Projeto' })

    const { result } = renderHook(() => useCreateProjectMutation(), { wrapper: createWrapper() })

    await result.current.mutateAsync({
      name: 'Novo Projeto',
      description: 'Descricao',
    })

    expect(mockApiFetch).toHaveBeenCalledWith('/projects', expect.objectContaining({
      method: 'POST',
    }))

    const body = JSON.parse(mockApiFetch.mock.calls[0][1].body)
    expect(body.name).toBe('Novo Projeto')
    expect(body.description).toBe('Descricao')
  })
})

describe('useMovePromptMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('envia POST para /move com stage', async () => {
    mockApiFetch.mockResolvedValueOnce({})

    const { result } = renderHook(() => useMovePromptMutation(), { wrapper: createWrapper() })

    await result.current.mutateAsync({
      id: 'prompt-move',
      stage: 'backlog',
    })

    expect(mockApiFetch).toHaveBeenCalledWith('/prompts/prompt-move/move', expect.objectContaining({
      method: 'POST',
    }))

    const body = JSON.parse(mockApiFetch.mock.calls[0][1].body)
    expect(body.stage).toBe('backlog')
  })
})

describe('useCreateTemplateMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('envia POST para /templates com body correto', async () => {
    mockApiFetch.mockResolvedValueOnce({
      id: 'tpl-new',
      name: 'New Template',
      steps: [{ provider: 'claude', role: 'review', instruction: '{input}' }],
    })

    const { result } = renderHook(() => useCreateTemplateMutation(), { wrapper: createWrapper() })

    await result.current.mutateAsync({
      name: 'New Template',
      description: 'A new template',
      steps: [{ provider: 'claude', role: 'review', instruction: '{input}' }],
      is_default: false,
    })

    expect(mockApiFetch).toHaveBeenCalledWith('/templates', expect.objectContaining({ method: 'POST' }))

    const body = JSON.parse(mockApiFetch.mock.calls[0][1].body)
    expect(body.name).toBe('New Template')
    expect(body.description).toBe('A new template')
    expect(body.steps).toHaveLength(1)
    expect(body.is_default).toBe(false)
  })
})

describe('useUpdateTemplateMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('envia PATCH para /templates/{id}', async () => {
    mockApiFetch.mockResolvedValueOnce({ id: 'tpl-1', name: 'Updated' })

    const { result } = renderHook(() => useUpdateTemplateMutation(), { wrapper: createWrapper() })

    await result.current.mutateAsync({
      id: 'tpl-1',
      name: 'Updated',
      steps: [{ provider: 'gemini', role: 'validate', instruction: '{input}' }],
    })

    expect(mockApiFetch).toHaveBeenCalledWith(
      '/templates/tpl-1',
      expect.objectContaining({ method: 'PATCH' }),
    )

    const body = JSON.parse(mockApiFetch.mock.calls[0][1].body)
    expect(body.name).toBe('Updated')
  })
})

describe('useDeleteTemplateMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('envia DELETE para /templates/{id}', async () => {
    mockApiFetch.mockResolvedValueOnce({ id: 'tpl-1', deleted: true })

    const { result } = renderHook(() => useDeleteTemplateMutation(), { wrapper: createWrapper() })

    await result.current.mutateAsync({ id: 'tpl-1' })

    expect(mockApiFetch).toHaveBeenCalledWith(
      '/templates/tpl-1',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})

describe('useUpdateProjectMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('envia PATCH para /projects/{id} com campos atualizados', async () => {
    mockApiFetch.mockResolvedValueOnce({ id: 'proj-1', name: 'Updated Project', status: 'active' })

    const { result } = renderHook(() => useUpdateProjectMutation(), { wrapper: createWrapper() })

    await result.current.mutateAsync({
      id: 'proj-1',
      name: 'Updated Project',
      description: 'New description',
      status: 'paused',
    })

    expect(mockApiFetch).toHaveBeenCalledWith(
      '/projects/proj-1',
      expect.objectContaining({ method: 'PATCH' }),
    )

    const body = JSON.parse(mockApiFetch.mock.calls[0][1].body)
    expect(body.name).toBe('Updated Project')
    expect(body.description).toBe('New description')
    expect(body.status).toBe('paused')
  })

  it('envia campos SLA na atualizacao', async () => {
    mockApiFetch.mockResolvedValueOnce({ id: 'proj-1' })

    const { result } = renderHook(() => useUpdateProjectMutation(), { wrapper: createWrapper() })

    await result.current.mutateAsync({
      id: 'proj-1',
      sla_timeout_seconds: 600,
      sla_max_retries: 5,
      sla_retry_delay_seconds: 120,
    })

    const body = JSON.parse(mockApiFetch.mock.calls[0][1].body)
    expect(body.sla_timeout_seconds).toBe(600)
    expect(body.sla_max_retries).toBe(5)
    expect(body.sla_retry_delay_seconds).toBe(120)
  })
})

describe('useReorderPrioritizedMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('envia POST para /prompts/reorder com array de ids', async () => {
    mockApiFetch.mockResolvedValueOnce({ ok: true })

    const { result } = renderHook(() => useReorderPrioritizedMutation(), { wrapper: createWrapper() })

    await result.current.mutateAsync(['prompt-3', 'prompt-1', 'prompt-2'])

    expect(mockApiFetch).toHaveBeenCalledWith(
      '/prompts/reorder',
      expect.objectContaining({ method: 'POST' }),
    )

    const body = JSON.parse(mockApiFetch.mock.calls[0][1].body)
    expect(body.ids).toEqual(['prompt-3', 'prompt-1', 'prompt-2'])
  })
})

describe('useEditPromptMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('envia POST para /prompts/{id}/edit com campos editados', async () => {
    mockApiFetch.mockResolvedValueOnce({ ok: true })

    const { result } = renderHook(() => useEditPromptMutation(), { wrapper: createWrapper() })

    await result.current.mutateAsync({
      id: 'prompt-edit-1',
      name: 'renamed-prompt',
      content: 'updated content here',
      target_folder: '/new/folder',
    })

    expect(mockApiFetch).toHaveBeenCalledWith(
      '/prompts/prompt-edit-1/edit',
      expect.objectContaining({ method: 'POST' }),
    )

    const body = JSON.parse(mockApiFetch.mock.calls[0][1].body)
    expect(body.name).toBe('renamed-prompt')
    expect(body.content).toBe('updated content here')
    expect(body.target_folder).toBe('/new/folder')
  })

  it('envia apenas campos fornecidos (parcial)', async () => {
    mockApiFetch.mockResolvedValueOnce({ ok: true })

    const { result } = renderHook(() => useEditPromptMutation(), { wrapper: createWrapper() })

    await result.current.mutateAsync({
      id: 'prompt-edit-2',
      name: 'only-rename',
    })

    const body = JSON.parse(mockApiFetch.mock.calls[0][1].body)
    expect(body.name).toBe('only-rename')
    expect(body).not.toHaveProperty('content')
    expect(body).not.toHaveProperty('target_folder')
  })
})

describe('useReprocessPromptMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('envia POST para /prompts/{id}/reprocess', async () => {
    mockApiFetch.mockResolvedValueOnce({ id: 'prompt-reprocessed' })

    const { result } = renderHook(() => useReprocessPromptMutation(), { wrapper: createWrapper() })

    await result.current.mutateAsync({ id: 'prompt-failed-1' })

    expect(mockApiFetch).toHaveBeenCalledWith(
      '/prompts/prompt-failed-1/reprocess',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('envia nome customizado no reprocessamento', async () => {
    mockApiFetch.mockResolvedValueOnce({ id: 'prompt-reprocessed-2' })

    const { result } = renderHook(() => useReprocessPromptMutation(), { wrapper: createWrapper() })

    await result.current.mutateAsync({ id: 'prompt-failed-2', name: 'retry-with-new-name' })

    const body = JSON.parse(mockApiFetch.mock.calls[0][1].body)
    expect(body.name).toBe('retry-with-new-name')
  })
})

describe('useLogsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('busca logs com parametros', async () => {
    mockApiFetch.mockResolvedValueOnce([
      { timestamp: '2026-01-01T00:00:00Z', level: 'INFO', worker: 'Claude', message: 'test' },
    ])

    const { result } = renderHook(
      () => useLogsQuery({ worker: 'Claude', level: 'INFO', lines: 100 }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(1)
    expect(mockApiFetch).toHaveBeenCalledWith(
      expect.stringContaining('/logs'),
      expect.anything(),
    )
  })
})
