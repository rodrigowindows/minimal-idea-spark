/**
 * Automation actions: what to do when a trigger fires.
 * Supports task creation, notifications, email, webhooks, delays, and conditionals.
 */

export type ActionKind =
  | 'create_task'
  | 'send_notification'
  | 'send_email'
  | 'log'
  | 'webhook'
  | 'delay'
  | 'condition'
  | 'update_field'
  | 'add_xp'

export interface CreateTaskAction {
  kind: 'create_task'
  title: string
  description?: string
  domain_id?: string
  type?: 'action' | 'study' | 'insight' | 'networking'
  priority?: number
}

export interface SendNotificationAction {
  kind: 'send_notification'
  title: string
  body: string
}

export interface SendEmailAction {
  kind: 'send_email'
  to: string
  subject: string
  body: string
}

export interface LogAction {
  kind: 'log'
  message: string
}

export interface WebhookAction {
  kind: 'webhook'
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  headers?: Record<string, string>
  body?: string
}

export interface DelayAction {
  kind: 'delay'
  seconds: number
}

export interface ConditionAction {
  kind: 'condition'
  field: string
  op: 'eq' | 'gt' | 'lt' | 'contains'
  value: string | number
  thenActions: Action[]
  elseActions: Action[]
}

export interface UpdateFieldAction {
  kind: 'update_field'
  entity: 'opportunity' | 'habit' | 'goal'
  entityId: string
  field: string
  value: string | number | boolean
}

export interface AddXPAction {
  kind: 'add_xp'
  amount: number
  reason: string
}

export type Action =
  | CreateTaskAction
  | SendNotificationAction
  | SendEmailAction
  | LogAction
  | WebhookAction
  | DelayAction
  | ConditionAction
  | UpdateFieldAction
  | AddXPAction

export const ACTION_KINDS: ActionKind[] = [
  'create_task',
  'send_notification',
  'send_email',
  'log',
  'webhook',
  'delay',
  'condition',
  'update_field',
  'add_xp',
]

export function describeAction(a: Action): string {
  switch (a.kind) {
    case 'create_task': return `Create task: ${a.title}`
    case 'send_notification': return `Notify: ${a.title}`
    case 'send_email': return `Email to ${a.to}: ${a.subject}`
    case 'log': return `Log: ${a.message}`
    case 'webhook': return `${a.method} webhook: ${a.url || '(url)'}`
    case 'delay': return `Wait ${a.seconds}s`
    case 'condition': return `If ${a.field} ${a.op} ${a.value} → ${a.thenActions.length} action(s)`
    case 'update_field': return `Update ${a.entity}.${a.field} = ${a.value}`
    case 'add_xp': return `Add ${a.amount} XP: ${a.reason}`
    default: return 'Unknown action'
  }
}

export function getDefaultAction(kind: ActionKind): Action {
  switch (kind) {
    case 'create_task': return { kind: 'create_task', title: 'New task', priority: 5 }
    case 'send_notification': return { kind: 'send_notification', title: '', body: '' }
    case 'send_email': return { kind: 'send_email', to: '', subject: '', body: '' }
    case 'log': return { kind: 'log', message: '' }
    case 'webhook': return { kind: 'webhook', url: '', method: 'POST' }
    case 'delay': return { kind: 'delay', seconds: 5 }
    case 'condition': return { kind: 'condition', field: '', op: 'eq', value: '', thenActions: [], elseActions: [] }
    case 'update_field': return { kind: 'update_field', entity: 'opportunity', entityId: '', field: 'status', value: 'done' }
    case 'add_xp': return { kind: 'add_xp', amount: 10, reason: 'Automation reward' }
  }
}

export function getActionIcon(kind: ActionKind): string {
  switch (kind) {
    case 'create_task': return 'plus-circle'
    case 'send_notification': return 'bell'
    case 'send_email': return 'mail'
    case 'log': return 'file-text'
    case 'webhook': return 'globe'
    case 'delay': return 'clock'
    case 'condition': return 'git-branch'
    case 'update_field': return 'edit'
    case 'add_xp': return 'star'
    default: return 'zap'
  }
}
