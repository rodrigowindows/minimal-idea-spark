import { describe, it, expect, beforeEach, vi } from 'vitest'

const store: Record<string, string> = {}
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value }),
  removeItem: vi.fn((key: string) => { delete store[key] }),
  clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]) }),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

import { enqueue, getQueue, clearQueue } from './sync-queue'

describe('sync-queue', () => {
  beforeEach(() => {
    localStorageMock.clear()
    clearQueue()
    vi.clearAllMocks()
  })

  it('should enqueue an item', () => {
    enqueue('create_opportunity', { title: 'Test' })
    const queue = getQueue()
    expect(queue.length).toBe(1)
    expect(queue[0].type).toBe('create_opportunity')
  })

  it('should enqueue multiple items', () => {
    enqueue('create_opportunity', { title: 'A' })
    enqueue('create_daily_log', { content: 'B' })
    expect(getQueue()).toHaveLength(2)
  })

  it('should clear the queue', () => {
    enqueue('create_daily_log', { content: 'Hello' })
    clearQueue()
    expect(getQueue()).toHaveLength(0)
  })

  it('should persist queue to localStorage', () => {
    enqueue('create_opportunity', { title: 'Persisted' })
    expect(localStorageMock.setItem).toHaveBeenCalled()
  })

  it('items should have id and createdAt', () => {
    enqueue('update_opportunity', { id: 'opp-1', title: 'Updated' })
    const item = getQueue()[0]
    expect(item.id).toBeTruthy()
    expect(item.createdAt).toBeTruthy()
    expect(item.retries).toBe(0)
  })
})
