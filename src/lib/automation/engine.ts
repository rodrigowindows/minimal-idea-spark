/**
 * Automation engine: evaluate triggers and execute actions.
 * Supports conditional branching, delays, webhooks, XP, field updates.
 */

import type { Trigger } from './triggers'
import type { Action, ConditionAction } from './actions'
import { appendExecutionLog } from './templates'
import { toast } from 'sonner'

export interface Automation {
  id: string
  name: string
  description: string
  enabled: boolean
  trigger: Trigger
  actions: Action[]
  createdAt: string
  lastRunAt?: string
  runCount: number
}

export interface TriggerContext {
  event?: string
  payload?: Record<string, unknown>
  userId: string
}

export function evaluateTrigger(trigger: Trigger, ctx: TriggerContext): boolean {
  switch (trigger.kind) {
    case 'event':
      return ctx.event === trigger.event
    case 'condition': {
      if (!ctx.payload) return false
      const v = ctx.payload[trigger.field]
      if (v === undefined) return false
      switch (trigger.op) {
        case 'eq': return v === trigger.value
        case 'not_eq': return v !== trigger.value
        case 'gt': return Number(v) > Number(trigger.value)
        case 'gte': return Number(v) >= Number(trigger.value)
        case 'lt': return Number(v) < Number(trigger.value)
        case 'lte': return Number(v) <= Number(trigger.value)
        case 'contains': return String(v).includes(String(trigger.value))
        case 'starts_with': return String(v).startsWith(String(trigger.value))
        case 'ends_with': return String(v).endsWith(String(trigger.value))
        default: return false
      }
    }
    case 'schedule':
      return true // schedule triggers are evaluated externally via cron
    case 'webhook':
      return true // webhooks are triggered by incoming requests
    case 'manual':
      return true // manual triggers always pass
    default:
      return false
  }
}

function evaluateCondition(action: ConditionAction, ctx: TriggerContext): boolean {
  const v = ctx.payload?.[action.field]
  if (v === undefined) return false
  switch (action.op) {
    case 'eq': return v === action.value
    case 'gt': return Number(v) > Number(action.value)
    case 'lt': return Number(v) < Number(action.value)
    case 'contains': return String(v).includes(String(action.value))
    default: return false
  }
}

function delay(seconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000))
}

export async function executeAction(action: Action, ctx: TriggerContext): Promise<void> {
  switch (action.kind) {
    case 'log':
      console.log('[Automation]', action.message)
      return

    case 'send_notification':
      toast(action.title, { description: action.body })
      return

    case 'create_task': {
      const opps = JSON.parse(localStorage.getItem('lifeos_opportunities') || '[]')
      opps.unshift({
        id: `opp-auto-${Date.now()}`,
        user_id: ctx.userId,
        domain_id: action.domain_id || null,
        title: action.title,
        description: action.description || 'Created by automation',
        type: action.type || 'action',
        status: 'backlog',
        priority: action.priority ?? 5,
        strategic_value: 5,
        created_at: new Date().toISOString(),
      })
      localStorage.setItem('lifeos_opportunities', JSON.stringify(opps))
      return
    }

    case 'send_email':
      console.log('[Automation] Email (mock):', action.to, action.subject, action.body)
      toast('Email sent (mock)', { description: `To: ${action.to} — ${action.subject}` })
      return

    case 'webhook': {
      try {
        await fetch(action.url, {
          method: action.method,
          headers: {
            'Content-Type': 'application/json',
            ...action.headers,
          },
          body: action.method !== 'GET' ? action.body || '{}' : undefined,
        })
      } catch (err) {
        console.error('[Automation] Webhook failed:', err)
      }
      return
    }

    case 'delay':
      await delay(action.seconds)
      return

    case 'condition': {
      const branch = evaluateCondition(action, ctx) ? action.thenActions : action.elseActions
      for (const subAction of branch) {
        await executeAction(subAction, ctx)
      }
      return
    }

    case 'update_field': {
      const keyMap: Record<string, string> = {
        opportunity: 'lifeos_opportunities',
        habit: 'lifeos_habits',
        goal: 'lifeos_goals',
      }
      const storageKey = keyMap[action.entity]
      if (!storageKey) return
      const items = JSON.parse(localStorage.getItem(storageKey) || '[]')
      const idx = items.findIndex((item: { id: string }) => item.id === action.entityId)
      if (idx >= 0) {
        items[idx][action.field] = action.value
        localStorage.setItem(storageKey, JSON.stringify(items))
      }
      return
    }

    case 'add_xp': {
      const xpState = JSON.parse(localStorage.getItem('minimal_idea_spark_xp_state') || '{}')
      const currentXp = xpState.current_xp || 0
      xpState.current_xp = currentXp + action.amount
      localStorage.setItem('minimal_idea_spark_xp_state', JSON.stringify(xpState))
      toast(`+${action.amount} XP`, { description: action.reason })
      return
    }
  }
}

export async function runAutomation(automation: Automation, ctx: TriggerContext): Promise<boolean> {
  if (!automation.enabled) return false
  if (!evaluateTrigger(automation.trigger, ctx)) return false

  let success = true
  try {
    for (const action of automation.actions) {
      await executeAction(action, ctx)
    }
  } catch (err) {
    success = false
    console.error('[Automation] Error running:', automation.name, err)
  }

  appendExecutionLog({
    automationId: automation.id,
    automationName: automation.name,
    trigger: ctx.event || automation.trigger.kind,
    success,
    details: success ? undefined : 'Execution error',
  })

  return success
}

export async function runAllAutomations(
  automations: Automation[],
  ctx: TriggerContext
): Promise<{ ran: number; failed: number }> {
  let ran = 0
  let failed = 0
  for (const automation of automations) {
    if (!automation.enabled) continue
    if (!evaluateTrigger(automation.trigger, ctx)) continue
    const ok = await runAutomation(automation, ctx)
    if (ok) ran++
    else failed++
  }
  return { ran, failed }
}
