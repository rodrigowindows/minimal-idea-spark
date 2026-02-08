import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRagChat } from './useRagChat'

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'mock-token' } },
      }),
    },
  },
}))

const mockFetch = vi.fn()
beforeEach(() => {
  global.fetch = mockFetch
  vi.clearAllMocks()
})

describe('useRagChat', () => {
  it('should have initial state', () => {
    const { result } = renderHook(() => useRagChat())
    expect(result.current.isStreaming).toBe(false)
    expect(result.current.streamingContent).toBe('')
    expect(result.current.sources).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('should set error when not authenticated', async () => {
    const { supabase } = await import('@/integrations/supabase/client')
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: null },
      error: null,
    })

    const { result } = renderHook(() => useRagChat())

    await act(async () => {
      result.current.sendMessage('hello')
    })

    expect(result.current.error).toBeTruthy()
    expect(result.current.isStreaming).toBe(false)
  })

  it('should set streaming then result on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: 'AI reply',
        sources: [{ title: 'S1', type: 'opportunity', relevance: 0.9 }],
        sessionId: 'sess-1',
      }),
    })

    const { result } = renderHook(() => useRagChat())

    let resolved: unknown = null
    act(() => {
      result.current.sendMessage('hi').then((r) => { resolved = r })
    })

    expect(result.current.isStreaming).toBe(true)

    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.isStreaming).toBe(false)
    expect(resolved).toEqual({
      content: 'AI reply',
      sources: [{ title: 'S1', type: 'opportunity', relevance: 0.9 }],
      sessionId: 'sess-1',
    })
  })

  it('should set error on 429', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ error: 'Too Many Requests' }),
    })

    const { result } = renderHook(() => useRagChat())

    await act(async () => {
      result.current.sendMessage('hi')
    })

    expect(result.current.error).toBeTruthy()
    expect(result.current.isStreaming).toBe(false)
  })
})
