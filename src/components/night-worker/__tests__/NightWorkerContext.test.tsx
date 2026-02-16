import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, renderHook } from '@testing-library/react'
import { NightWorkerProvider, useNightWorker, ApiError } from '@/contexts/NightWorkerContext'
import type { ReactNode } from 'react'

function Wrapper({ children }: { children: ReactNode }) {
  return <NightWorkerProvider>{children}</NightWorkerProvider>
}

describe('useNightWorker - outside provider', () => {
  it('returns fallback values when outside NightWorkerProvider', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { result } = renderHook(() => useNightWorker())

    expect(result.current.isConnected).toBe(false)
    expect(result.current.lastError).toBe('provider_missing')
    spy.mockRestore()
  })

  it('apiFetch throws when outside provider', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { result } = renderHook(() => useNightWorker())

    await expect(result.current.apiFetch('/test')).rejects.toThrow('NightWorkerProvider not available')
    spy.mockRestore()
  })
})

describe('useNightWorker - inside provider', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns isConnected=true inside provider', () => {
    const { result } = renderHook(() => useNightWorker(), { wrapper: Wrapper })
    expect(result.current.isConnected).toBe(true)
  })

  it('config has default baseUrl', () => {
    const { result } = renderHook(() => useNightWorker(), { wrapper: Wrapper })
    expect(result.current.config.baseUrl).toBeTruthy()
  })

  it('setToken updates config token', () => {
    const { result } = renderHook(() => useNightWorker(), { wrapper: Wrapper })

    act(() => {
      result.current.setToken('my-new-token')
    })

    expect(result.current.config.token).toBe('my-new-token')
  })

  it('setConfig updates workers config', () => {
    const { result } = renderHook(() => useNightWorker(), { wrapper: Wrapper })

    act(() => {
      result.current.setConfig({
        workers: {
          claude: { ...result.current.config.workers.claude, intervalSeconds: 120 },
          codex: result.current.config.workers.codex,
        },
      })
    })

    expect(result.current.config.workers.claude.intervalSeconds).toBe(120)
  })

  it('config has claude and codex workers', () => {
    const { result } = renderHook(() => useNightWorker(), { wrapper: Wrapper })
    expect(result.current.config.workers.claude).toBeDefined()
    expect(result.current.config.workers.codex).toBeDefined()
    expect(result.current.config.workers.claude.provider).toBe('claude_cli')
    expect(result.current.config.workers.codex.provider).toBe('codex_cli')
  })

  it('config has providers list', () => {
    const { result } = renderHook(() => useNightWorker(), { wrapper: Wrapper })
    expect(result.current.config.providers).toContain('claude_cli')
    expect(result.current.config.providers).toContain('codex_cli')
  })
})

describe('ApiError', () => {
  it('creates error with message and status', () => {
    const error = new ApiError('Not found', 404)
    expect(error.message).toBe('Not found')
    expect(error.status).toBe(404)
    expect(error).toBeInstanceOf(Error)
  })

  it('creates error without status', () => {
    const error = new ApiError('Unknown error')
    expect(error.message).toBe('Unknown error')
    expect(error.status).toBeUndefined()
  })
})
