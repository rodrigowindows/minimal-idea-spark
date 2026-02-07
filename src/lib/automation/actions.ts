/**
 * Automation actions: what to do when a trigger fires.
 */

export type ActionKind = 'create_task' | 'send_notification' | 'send_email' | 'log'

export interface CreateTaskAction {
  kind: 'create_task'
  title: string
  description?: string
  domain_id?: string
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

export type Action = CreateTaskAction | SendNotificationAction | SendEmailAction | LogAction

export const ACTION_KINDS = ['create_task', 'send_notification', 'send_email', 'log'] as const

export function describeAction(a: Action): string {
  if (a.kind === 'create_task') return `Create task: ${a.title}`
  if (a.kind === 'send_notification') return `Notify: ${a.title}`
  if (a.kind === 'send_email') return `Email to ${a.to}: ${a.subject}`
  if (a.kind === 'log') return `Log: ${a.message}`
  return 'Unknown action'
}
