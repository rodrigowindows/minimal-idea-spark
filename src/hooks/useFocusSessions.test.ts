import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFocusSessions } from './useFocusSessions'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('useFocusSessions', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('should initialize with empty sessions', () => {
    const { result } = renderHook(() => useFocusSessions())
    expect(result.current.sessions).toEqual([])
  })

  it('should add a session and persist', () => {
    const { result } = renderHook(() => useFocusSessions())

    act(() => {
      result.current.addSession({
        started_at: new Date().toISOString(),
        duration_minutes: 25,
        opportunity_id: 'opp-1',
        user_id: 'u1',
        notes: null,
      })
    })

    expect(result.current.sessions).toHaveLength(1)
    expect(result.current.sessions[0].duration_minutes).toBe(25)
    expect(result.current.sessions[0].id).toBeTruthy()
    expect(localStorageMock.setItem).toHaveBeenCalled()
  })

  it('getTotalMinutesToday returns minutes for today only', () => {
    const { result } = renderHook(() => useFocusSessions())
    const today = new Date().toISOString()
    const yesterday = new Date(Date.now() - 86400000).toISOString()

    act(() => {
      result.current.addSession({ started_at: today, duration_minutes: 25, user_id: 'u', opportunity_id: null, notes: null })
      result.current.addSession({ started_at: today, duration_minutes: 30, user_id: 'u', opportunity_id: null, notes: null })
      result.current.addSession({ started_at: yesterday, duration_minutes: 60, user_id: 'u', opportunity_id: null, notes: null })
    })

    expect(result.current.getTotalMinutesToday()).toBe(55)
  })

  it('getTotalMinutesThisWeek returns weekly total', () => {
    const { result } = renderHook(() => useFocusSessions())

    act(() => {
      result.current.addSession({
        started_at: new Date().toISOString(),
        duration_minutes: 45,
        user_id: 'u',
        opportunity_id: null,
        notes: null,
      })
    })

    expect(result.current.getTotalMinutesThisWeek()).toBe(45)
  })

  it('getRecentSessions returns limited items', () => {
    const { result } = renderHook(() => useFocusSessions())

    act(() => {
      for (let i = 0; i < 15; i++) {
        result.current.addSession({
          started_at: new Date().toISOString(),
          duration_minutes: 25,
          user_id: 'u',
          opportunity_id: null,
          notes: null,
        })
      }
    })

    expect(result.current.getRecentSessions(5)).toHaveLength(5)
    expect(result.current.getRecentSessions()).toHaveLength(10)
  })
})
