/**
 * Pre-defined automation templates and execution log management.
 */

import type { Trigger } from './triggers'
import type { Action } from './actions'

export interface AutomationTemplate {
  id: string
  name: string
  description: string
  category: 'productivity' | 'wellness' | 'notifications' | 'integrations' | 'gamification'
  trigger: Trigger
  actions: Action[]
}

export const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  {
    id: 'notify-on-task-done',
    name: 'Notify when task completed',
    description: 'Get a notification every time you complete a task.',
    category: 'notifications',
    trigger: { kind: 'event', event: 'task_completed' },
    actions: [{ kind: 'send_notification', title: 'Task done!', body: 'You completed a task. Keep it up!' }],
  },
  {
    id: 'daily-reminder',
    name: 'Daily morning reminder',
    description: 'Receive a daily reminder to review your priorities.',
    category: 'productivity',
    trigger: { kind: 'schedule', cron: '0 9 * * *', timezone: 'UTC' },
    actions: [{ kind: 'send_notification', title: 'Daily check-in', body: 'Time to review your priorities!' }],
  },
  {
    id: 'follow-up-task',
    name: 'Create follow-up task on complete',
    description: 'When you complete a task, create a follow-up task automatically.',
    category: 'productivity',
    trigger: { kind: 'event', event: 'task_completed' },
    actions: [
      { kind: 'create_task', title: 'Follow-up from completed task' },
      { kind: 'send_notification', title: 'Follow-up created', body: 'A follow-up task was added.' },
    ],
  },
  {
    id: 'journal-saved-notify',
    name: 'Notify on journal save',
    description: 'Get a confirmation when you save a journal entry.',
    category: 'notifications',
    trigger: { kind: 'event', event: 'journal_saved' },
    actions: [{ kind: 'send_notification', title: 'Journal saved', body: 'Your reflection was saved.' }],
  },
  {
    id: 'capture-to-task',
    name: 'Create task from capture',
    description: 'When you save a quick capture, create a task from it.',
    category: 'productivity',
    trigger: { kind: 'event', event: 'capture_saved' },
    actions: [
      { kind: 'create_task', title: 'From capture', priority: 5 },
      { kind: 'log', message: 'Capture processed' },
    ],
  },
  {
    id: 'xp-on-task-complete',
    name: 'Award XP on task completion',
    description: 'Automatically reward XP when you finish tasks.',
    category: 'gamification',
    trigger: { kind: 'event', event: 'task_completed' },
    actions: [
      { kind: 'add_xp', amount: 20, reason: 'Task completed' },
      { kind: 'send_notification', title: '+20 XP!', body: 'You earned XP for completing a task.' },
    ],
  },
  {
    id: 'focus-session-reward',
    name: 'Reward focus sessions',
    description: 'Earn XP after completing a deep focus session.',
    category: 'gamification',
    trigger: { kind: 'event', event: 'focus_session_completed' },
    actions: [
      { kind: 'add_xp', amount: 30, reason: 'Focus session completed' },
      { kind: 'send_notification', title: 'Deep work!', body: 'You earned 30 XP for focus time.' },
    ],
  },
  {
    id: 'habit-streak-bonus',
    name: 'Streak milestone bonus',
    description: 'Bonus notification and XP when you hit a streak milestone.',
    category: 'gamification',
    trigger: { kind: 'event', event: 'streak_milestone' },
    actions: [
      { kind: 'add_xp', amount: 50, reason: 'Streak milestone!' },
      { kind: 'send_notification', title: 'Streak milestone!', body: 'Your consistency is paying off.' },
    ],
  },
  {
    id: 'evening-journal-reminder',
    name: 'Evening journal reminder',
    description: 'A nightly reminder to write in your journal.',
    category: 'wellness',
    trigger: { kind: 'schedule', cron: '0 21 * * *' },
    actions: [
      { kind: 'send_notification', title: 'Journal time', body: 'Take a few minutes to reflect on your day.' },
    ],
  },
  {
    id: 'weekly-review-reminder',
    name: 'Weekly review reminder',
    description: 'Sunday morning reminder to do your weekly review.',
    category: 'wellness',
    trigger: { kind: 'schedule', cron: '0 10 * * 0' },
    actions: [
      { kind: 'send_notification', title: 'Weekly review', body: 'Review your week and plan ahead.' },
    ],
  },
  {
    id: 'webhook-on-level-up',
    name: 'Webhook on level up',
    description: 'Call an external API when you level up.',
    category: 'integrations',
    trigger: { kind: 'event', event: 'level_up' },
    actions: [
      { kind: 'webhook', url: '', method: 'POST', body: '{"event":"level_up"}' },
      { kind: 'log', message: 'Level up webhook sent' },
    ],
  },
  {
    id: 'conditional-priority',
    name: 'High priority task alert',
    description: 'Send an alert when a high-priority task is created.',
    category: 'notifications',
    trigger: { kind: 'event', event: 'task_created' },
    actions: [
      {
        kind: 'condition',
        field: 'priority',
        op: 'gt',
        value: 8,
        thenActions: [
          { kind: 'send_notification', title: 'High priority!', body: 'A high-priority task was created.' },
        ],
        elseActions: [
          { kind: 'log', message: 'Normal priority task created' },
        ],
      },
    ],
  },
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

export function clearExecutionLog(): void {
  localStorage.removeItem(STORAGE_KEY)
}
