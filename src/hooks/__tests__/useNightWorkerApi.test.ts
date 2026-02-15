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
  useCreatePromptMutation,
  useCreateProjectMutation,
  useMovePromptMutation,
  useLogsQuery,
} from '@/hooks/useNightWorkerApi'
import { ApiError } from '@/contexts/NightWorkerContext'

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

  it('status padrao e "active" se nao for "archived"', async () => {
    mockApiFetch.mockResolvedValueOnce([
      { id: 'p1', name: 'A', status: 'archived' },
      { id: 'p2', name: 'B', status: 'whatever' },
      { id: 'p3', name: 'C' },
    ])

    const { result } = renderHook(() => useProjectsQuery('all'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data![0].status).toBe('archived')
    expect(result.current.data![1].status).toBe('active')
    expect(result.current.data![2].status).toBe('active')
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
