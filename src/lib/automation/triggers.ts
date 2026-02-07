/**
 * Automation triggers: when to run an automation.
 * Supports event-based, scheduled, conditional, and webhook triggers.
 */

export type TriggerKind = 'event' | 'schedule' | 'condition' | 'webhook' | 'manual'

export interface EventTrigger {
  kind: 'event'
  event: typeof TRIGGER_EVENTS[number]
}

export interface ScheduleTrigger {
  kind: 'schedule'
  cron: string
  timezone?: string
}

export interface ConditionTrigger {
  kind: 'condition'
  field: string
  op: 'eq' | 'gt' | 'lt' | 'contains' | 'not_eq' | 'gte' | 'lte' | 'starts_with' | 'ends_with'
  value: string | number
}

export interface WebhookTrigger {
  kind: 'webhook'
  url: string
  method: 'GET' | 'POST'
  headers?: Record<string, string>
}

export interface ManualTrigger {
  kind: 'manual'
}

export type Trigger = EventTrigger | ScheduleTrigger | ConditionTrigger | WebhookTrigger | ManualTrigger

export const TRIGGER_EVENTS = [
  'task_created',
  'task_completed',
  'task_status_changed',
  'journal_saved',
  'capture_saved',
  'habit_completed',
  'goal_updated',
  'xp_gained',
  'level_up',
  'streak_milestone',
  'focus_session_completed',
  'calendar_event_created',
  'domain_target_reached',
] as const

export const TRIGGER_KINDS: TriggerKind[] = ['event', 'schedule', 'condition', 'webhook', 'manual']

export const CONDITION_OPS = ['eq', 'not_eq', 'gt', 'gte', 'lt', 'lte', 'contains', 'starts_with', 'ends_with'] as const

export function describeTrigger(t: Trigger): string {
  if (t.kind === 'event') return `When ${t.event.replace(/_/g, ' ')}`
  if (t.kind === 'schedule') return `On schedule: ${t.cron}`
  if (t.kind === 'condition') return `When ${t.field} ${t.op} ${t.value}`
  if (t.kind === 'webhook') return `On webhook: ${t.method} ${t.url}`
  if (t.kind === 'manual') return 'Manual trigger (run on demand)'
  return 'Unknown trigger'
}

export function getDefaultTrigger(kind: TriggerKind): Trigger {
  switch (kind) {
    case 'event': return { kind: 'event', event: 'task_completed' }
    case 'schedule': return { kind: 'schedule', cron: '0 9 * * *' }
    case 'condition': return { kind: 'condition', field: 'status', op: 'eq', value: 'done' }
    case 'webhook': return { kind: 'webhook', url: '', method: 'POST' }
    case 'manual': return { kind: 'manual' }
  }
}

export function parseCronToHuman(cron: string): string {
  const parts = cron.split(' ')
  if (parts.length !== 5) return cron

  const [min, hour, dayMonth, month, dayWeek] = parts

  if (dayMonth === '*' && month === '*' && dayWeek === '*') {
    if (min === '0' && hour !== '*') return `Daily at ${hour}:00`
    if (hour === '*' && min === '0') return 'Every hour'
    if (hour === '*' && min === '*/5') return 'Every 5 minutes'
    if (hour === '*' && min === '*/15') return 'Every 15 minutes'
    if (hour === '*' && min === '*/30') return 'Every 30 minutes'
  }
  if (dayWeek === '1-5' && min === '0') return `Weekdays at ${hour}:00`
  if (dayWeek === '0' && min === '0') return `Sundays at ${hour}:00`
  if (dayMonth === '1' && month === '*' && min === '0') return `Monthly on 1st at ${hour}:00`

  return cron
}
