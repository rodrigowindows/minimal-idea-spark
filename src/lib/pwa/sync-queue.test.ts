import { describe, it, expect, beforeEach, vi } from 'vitest'

const store: Record<string, string> = {}
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value }),
  removeItem: vi.fn((key: string) => { delete store[key] }),
  clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]) }),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock offline-manager to avoid dynamic import issues
vi.mock('./offline-manager', () => ({
  requestBackgroundSync: vi.fn(),
}))

import { enqueue, getQueue, clearQueue } from './sync-queue'

describe('sync-queue', () => {
  beforeEach(() => {
    localStorageMock.clear()
    clearQueue()
    vi.clearAllMocks()
  })

  it('should enqueue an item', () => {
    enqueue('create_opportunity', { title: 'Test' }, 'local-1')
    const queue = getQueue()
    expect(queue.length).toBe(1)
    expect(queue[0].type).toBe('create_opportunity')
    expect(queue[0].localId).toBe('local-1')
  })

  it('should enqueue multiple items', () => {
    enqueue('create_opportunity', { title: 'A' }, 'local-1')
    enqueue('create_daily_log', { content: 'B' }, 'local-2')
    expect(getQueue()).toHaveLength(2)
  })

  it('should clear the queue', () => {
    enqueue('create_daily_log', { content: 'Hello' }, 'local-1')
    clearQueue()
    expect(getQueue()).toHaveLength(0)
  })

  it('should persist queue to localStorage', () => {
    enqueue('create_opportunity', { title: 'Persisted' }, 'local-1')
    expect(localStorageMock.setItem).toHaveBeenCalled()
  })

  it('items should have id and createdAt', () => {
    enqueue('update_opportunity', { id: 'opp-1', title: 'Updated' }, 'opp-1')
    const item = getQueue()[0]
    expect(item.id).toBeTruthy()
    expect(item.createdAt).toBeTruthy()
    expect(item.retries).toBe(0)
  })
})
