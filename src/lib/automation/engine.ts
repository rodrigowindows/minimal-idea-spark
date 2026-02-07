/**
 * Automation engine: evaluate triggers and execute actions.
 */

import type { Trigger } from './triggers'
import type { Action } from './actions'

export interface Automation {
  id: string
  name: string
  enabled: boolean
  trigger: Trigger
  actions: Action[]
  createdAt: string
}

export interface TriggerContext {
  event?: string
  payload?: Record<string, unknown>
  userId: string
}

export function evaluateTrigger(trigger: Trigger, ctx: TriggerContext): boolean {
  if (trigger.kind === 'event') {
    return ctx.event === trigger.event
  }
  if (trigger.kind === 'condition' && ctx.payload) {
    const v = ctx.payload[trigger.field]
    if (v === undefined) return false
    switch (trigger.op) {
      case 'eq': return v === trigger.value
      case 'gt': return Number(v) > Number(trigger.value)
      case 'lt': return Number(v) < Number(trigger.value)
      case 'contains': return String(v).includes(String(trigger.value))
      default: return false
    }
  }
  if (trigger.kind === 'schedule') {
    return true
  }
  return false
}

export async function executeAction(action: Action, _ctx: TriggerContext): Promise<void> {
  if (action.kind === 'log') {
    console.log('[Automation]', action.message)
    return
  }
  if (action.kind === 'send_notification') {
    if (typeof window !== 'undefined' && 'toast' in window) {
      (window as unknown as { toast: { success: (s: string) => void } }).toast?.success?.(action.title)
    }
    return
  }
  if (action.kind === 'create_task' || action.kind === 'send_email') {
    // Would call Supabase or API
    return
  }
}

export async function runAutomation(automation: Automation, ctx: TriggerContext): Promise<boolean> {
  if (!automation.enabled) return false
  if (!evaluateTrigger(automation.trigger, ctx)) return false
  for (const action of automation.actions) {
    await executeAction(action, ctx)
  }
  return true
}
