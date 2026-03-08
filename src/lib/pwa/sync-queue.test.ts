import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock localStorage
const store: Record<string, string> = {}
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value }),
  removeItem: vi.fn((key: string) => { delete store[key] }),
  clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]) }),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Dynamic import after mocks are set up
let enqueue: any, getQueue: any, clearQueue: any

beforeEach(async () => {
  localStorageMock.clear()
  vi.clearAllMocks()
  vi.resetModules()
  const mod = await import('./sync-queue')
  enqueue = mod.enqueue
  getQueue = mod.getQueue
  clearQueue = mod.clearQueue
})

describe('sync-queue', () => {
  it('should enqueue an item', () => {
    enqueue({ type: 'create_opportunity', payload: { title: 'Test' } })
    const queue = getQueue()
    expect(queue.length).toBeGreaterThanOrEqual(1)
  })

  it('should clear the queue', () => {
    enqueue({ type: 'create_daily_log', payload: { content: 'Hello' } })
    clearQueue()
    const queue = getQueue()
    expect(queue).toHaveLength(0)
  })

  it('should persist queue to localStorage', () => {
    enqueue({ type: 'create_opportunity', payload: { title: 'Persisted' } })
    expect(localStorageMock.setItem).toHaveBeenCalled()
  })
})
