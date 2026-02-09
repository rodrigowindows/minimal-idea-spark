import { describe, it, expect, beforeEach } from 'vitest'
import { checkReminders, clearShownReminders, type ReminderOpportunity } from './reminders'

describe('reminders', () => {
  beforeEach(() => {
    clearShownReminders()
  })

  it('calls onRemind for overdue opportunities', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const opps: ReminderOpportunity[] = [
      { id: '1', title: 'Overdue task', due_date: yesterday.toISOString().slice(0, 10) },
    ]
    const called: string[] = []
    checkReminders(opps, (opp, msg) => { called.push(msg) })
    expect(called).toContainEqual(expect.stringContaining('Overdue'))
    expect(called[0]).toContain('Overdue task')
  })

  it('calls onRemind for due today', () => {
    const today = new Date().toISOString().slice(0, 10)
    const opps: ReminderOpportunity[] = [
      { id: '2', title: 'Due today', due_date: today },
    ]
    const called: string[] = []
    checkReminders(opps, (opp, msg) => { called.push(msg) })
    expect(called.some((m) => m.includes('Due today'))).toBe(true)
  })

  it('ignores opportunities without due_date', () => {
    const opps: ReminderOpportunity[] = [
      { id: '3', title: 'No date' },
    ]
    const called: string[] = []
    checkReminders(opps, (opp, msg) => { called.push(msg) })
    expect(called).toHaveLength(0)
  })
})
