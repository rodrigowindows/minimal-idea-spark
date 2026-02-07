/**
 * Pre-defined automation templates.
 */

import type { Trigger } from './triggers'
import type { Action } from './actions'

export interface AutomationTemplate {
  id: string
  name: string
  description: string
  trigger: Trigger
  actions: Action[]
}

export const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  { id: 'notify-on-task-done', name: 'Notify when task is completed', description: 'Get a notification every time you complete a task.', trigger: { kind: 'event', event: 'task_completed' }, actions: [{ kind: 'send_notification', title: 'Task done!', body: 'You completed a task. Keep it up!' }] },
  { id: 'daily-reminder', name: 'Daily reminder', description: 'Receive a daily reminder (schedule-based).', trigger: { kind: 'schedule', cron: '0 9 * * *', timezone: 'UTC' }, actions: [{ kind: 'send_notification', title: 'Daily check-in', body: 'Time to review your priorities!' }] },
  { id: 'follow-up-task', name: 'Create follow-up task on complete', description: 'When you complete a task, create a follow-up task.', trigger: { kind: 'event', event: 'task_completed' }, actions: [{ kind: 'create_task', title: 'Follow-up from completed task' }, { kind: 'send_notification', title: 'Follow-up created', body: 'A follow-up task was added.' }] },
  { id: 'journal-saved-notify', name: 'Notify on journal save', description: 'Get a confirmation when you save a journal entry.', trigger: { kind: 'event', event: 'journal_saved' }, actions: [{ kind: 'send_notification', title: 'Journal saved', body: 'Your reflection was saved.' }] },
  { id: 'capture-to-task', name: 'Create task from capture', description: 'When you save a quick capture, create a task from it.', trigger: { kind: 'event', event: 'capture_saved' }, actions: [{ kind: 'create_task', title: 'From capture' }, { kind: 'log', message: 'Capture processed' }] },
]

const STORAGE_KEY = 'minimal_idea_spark_automation_log'

export interface LogEntry {
  id: string
  automationId: string
  automationName: string
  trigger: string
  success: boolean
  at: string
  details?: string
}

export function getExecutionLog(): LogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch { return [] }
}

export function appendExecutionLog(entry: Omit<LogEntry, 'id' | 'at'>): void {
  const log = getExecutionLog()
  const newEntry: LogEntry = { ...entry, id: crypto.randomUUID(), at: new Date().toISOString() }
  log.unshift(newEntry)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(log.slice(0, 200)))
}
