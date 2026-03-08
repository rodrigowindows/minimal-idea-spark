import { describe, it, expect } from 'vitest'
import {
  scorePriority,
  sortByPriority,
  groupByKey,
  getSmartGroups,
  getPriorityLevel,
} from './priority-engine'
import type { AppNotification } from './manager'

function makeNotification(overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id: 'n-1',
    title: 'Test notification',
    body: 'Test body',
    channel: 'in_app',
    read: false,
    createdAt: new Date().toISOString(),
    priority: 0,
    type: 'general',
    archived: false,
    ...overrides,
  }
}

describe('priority-engine', () => {
  describe('scorePriority', () => {
    it('should score higher for urgent keywords', () => {
      const normal = makeNotification({ title: 'Hello' })
      const urgent = makeNotification({ title: 'Urgent: deadline approaching' })
      expect(scorePriority(urgent)).toBeGreaterThan(scorePriority(normal))
    })

    it('should score higher for unread notifications', () => {
      const unread = makeNotification({ read: false })
      const read = makeNotification({ read: true })
      expect(scorePriority(unread)).toBeGreaterThan(scorePriority(read))
    })

    it('should score higher for task_due type', () => {
      const task = makeNotification({ type: 'task_due' })
      const general = makeNotification({ type: 'general' })
      expect(scorePriority(task)).toBeGreaterThan(scorePriority(general))
    })

    it('should score higher for recent notifications', () => {
      const recent = makeNotification({ createdAt: new Date().toISOString() })
      const old = makeNotification({ createdAt: new Date(Date.now() - 7 * 86400000).toISOString() })
      expect(scorePriority(recent)).toBeGreaterThan(scorePriority(old))
    })

    it('should include explicit priority value', () => {
      const high = makeNotification({ priority: 50 })
      const low = makeNotification({ priority: 0 })
      expect(scorePriority(high)).toBeGreaterThan(scorePriority(low))
    })
  })

  describe('sortByPriority', () => {
    it('should sort highest score first', () => {
      const list = [
        makeNotification({ id: 'low', type: 'general', read: true }),
        makeNotification({ id: 'high', type: 'task_due', title: 'Urgent deadline' }),
      ]
      const sorted = sortByPriority(list)
      expect(sorted[0].id).toBe('high')
    })

    it('should not mutate original array', () => {
      const list = [makeNotification()]
      const sorted = sortByPriority(list)
      expect(sorted).not.toBe(list)
    })
  })

  describe('groupByKey', () => {
    it('should group by groupKey when present', () => {
      const list = [
        makeNotification({ id: '1', groupKey: 'goals' }),
        makeNotification({ id: '2', groupKey: 'goals' }),
        makeNotification({ id: '3', type: 'streak' }),
      ]
      const groups = groupByKey(list)
      expect(groups.get('goals')).toHaveLength(2)
      expect(groups.get('streak')).toHaveLength(1)
    })

    it('should fallback to type when no groupKey', () => {
      const list = [makeNotification({ type: 'achievement' })]
      const groups = groupByKey(list)
      expect(groups.has('achievement')).toBe(true)
    })
  })

  describe('getSmartGroups', () => {
    it('should return groups sorted by top priority', () => {
      const list = [
        makeNotification({ type: 'general', title: 'Hello' }),
        makeNotification({ type: 'task_due', title: 'Urgent deadline overdue' }),
      ]
      const groups = getSmartGroups(list)
      expect(groups.length).toBeGreaterThan(0)
      expect(groups[0].topPriority).toBeGreaterThanOrEqual(groups[groups.length - 1].topPriority)
    })

    it('should format group labels', () => {
      const list = [makeNotification({ type: 'task_due' })]
      const groups = getSmartGroups(list)
      expect(groups[0].label).toBe('Tasks Due')
    })
  })

  describe('getPriorityLevel', () => {
    it('should return critical for high score', () => {
      const n = makeNotification({ priority: 50, type: 'task_due', title: 'Urgent deadline' })
      expect(getPriorityLevel(n)).toBe('critical')
    })

    it('should return low for minimal notification', () => {
      const n = makeNotification({
        type: 'general',
        read: true,
        createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      })
      expect(getPriorityLevel(n)).toBe('low')
    })
  })
})
