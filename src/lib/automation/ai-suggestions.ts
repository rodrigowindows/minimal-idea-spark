/**
 * AI-suggested automations based on behavior (mock; can call edge function later).
 */

import { AUTOMATION_TEMPLATES } from './templates'
import type { Trigger } from './triggers'
import type { Action } from './actions'

export interface SuggestedAutomation {
  name: string
  reason: string
  trigger: Trigger
  actions: Action[]
}

export function suggestAutomations(_context?: { tasksCompleted?: number; journalCount?: number }): SuggestedAutomation[] {
  return AUTOMATION_TEMPLATES.slice(0, 3).map(t => ({
    name: t.name,
    reason: `Based on your usage: ${t.description}`,
    trigger: t.trigger,
    actions: t.actions,
  }))
}
