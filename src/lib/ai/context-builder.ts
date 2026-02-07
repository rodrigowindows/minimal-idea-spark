/**
 * Build context payload for the AI assistant (workspace, recent items, goals).
 */

export interface AssistantContext {
  workspaceId?: string
  workspaceName?: string
  recentOpportunities: { id: string; title: string }[]
  currentGoals: string[]
  lastJournalMood?: string
}

export function buildAssistantContext(partial: Partial<AssistantContext>): AssistantContext {
  return {
    recentOpportunities: partial.recentOpportunities ?? [],
    currentGoals: partial.currentGoals ?? [],
    ...partial,
  }
}

export function contextToPrompt(ctx: AssistantContext): string {
  const parts: string[] = []
  if (ctx.workspaceName) parts.push(`Workspace: ${ctx.workspaceName}`)
  if (ctx.recentOpportunities.length) {
    parts.push('Recent tasks: ' + ctx.recentOpportunities.map(o => o.title).join('; '))
  }
  if (ctx.currentGoals.length) {
    parts.push('Current goals: ' + ctx.currentGoals.join('; '))
  }
  if (ctx.lastJournalMood) parts.push(`Last journal mood: ${ctx.lastJournalMood}`)
  return parts.join('\n')
}
