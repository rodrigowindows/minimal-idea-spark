/**
 * Automation triggers: when to run an automation.
 */

export type TriggerKind = 'event' | 'schedule' | 'condition'

export interface EventTrigger {
  kind: 'event'
  event: 'task_created' | 'task_completed' | 'journal_saved' | 'capture_saved'
}

export interface ScheduleTrigger {
  kind: 'schedule'
  cron: string
  timezone?: string
}

export interface ConditionTrigger {
  kind: 'condition'
  field: string
  op: 'eq' | 'gt' | 'lt' | 'contains'
  value: string | number
}

export type Trigger = EventTrigger | ScheduleTrigger | ConditionTrigger

export const TRIGGER_EVENTS = ['task_created', 'task_completed', 'journal_saved', 'capture_saved'] as const

export function describeTrigger(t: Trigger): string {
  if (t.kind === 'event') return `When ${t.event.replace(/_/g, ' ')}`
  if (t.kind === 'schedule') return `On schedule: ${t.cron}`
  if (t.kind === 'condition') return `When ${t.field} ${t.op} ${t.value}`
  return 'Unknown trigger'
}
