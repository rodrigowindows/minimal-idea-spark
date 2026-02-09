import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePriorities } from './usePriorities'

const mockUser = { id: 'mock-user-001', email: 'test@test.com' }
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}))

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

describe('usePriorities', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('should initialize with empty priorities', () => {
    const { result } = renderHook(() => usePriorities())
    expect(result.current.priorities).toEqual([])
    expect(result.current.activePriorities).toEqual([])
    expect(result.current.stats.total).toBe(0)
  })

  it('should add a priority', () => {
    const { result } = renderHook(() => usePriorities())

    act(() => {
      result.current.addPriority({
        title: 'Test priority',
        description: 'Desc',
        priority_level: 'high',
        category: 'career',
      })
    })

    expect(result.current.priorities).toHaveLength(1)
    expect(result.current.priorities[0].title).toBe('Test priority')
    expect(result.current.priorities[0].status).toBe('active')
    expect(result.current.stats.total).toBe(1)
  })

  it('should update and delete priority', () => {
    const { result } = renderHook(() => usePriorities())

    act(() => {
      result.current.addPriority({
        title: 'P1',
        description: '',
        priority_level: 'medium',
        category: 'personal',
      })
    })
    const id = result.current.priorities[0].id

    act(() => {
      result.current.updatePriority(id, { title: 'P1 updated' })
    })
    expect(result.current.priorities[0].title).toBe('P1 updated')

    act(() => {
      result.current.deletePriority(id)
    })
    expect(result.current.priorities).toHaveLength(0)
  })

  it('should compute insights and suggestions', () => {
    const { result } = renderHook(() =>
      usePriorities(
        [{ title: 'O1', status: 'backlog', type: 'task', strategic_value: 5 }],
        [{ id: 'g1', user_id: 'mock-user-001', title: 'G1', description: '', domain_id: null, target_date: '', progress: 0, milestones: [], created_at: '' }]
      )
    )
    expect(result.current.insights).toBeDefined()
    expect(result.current.suggestions).toBeDefined()
    expect(result.current.priorityContext).toBeDefined()
  })
})
