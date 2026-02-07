import type { Priority, KeyResult, PersistentObjectiveContext } from './priority-context'
import { loadPersistentContext } from './priority-context'
import type { Goal } from '@/hooks/useLocalData'

/**
 * Generates a text representation of a priority for embedding/search purposes.
 * Used both locally (for keyword matching) and remotely (for vector embeddings).
 */
export function priorityToEmbeddingText(priority: Priority): string {
  const parts = [
    priority.title,
    priority.description,
    `Category: ${priority.category}`,
    `Priority: ${priority.priority_level}`,
    `Progress: ${priority.progress}%`,
  ]

  if (priority.key_results.length > 0) {
    parts.push('Key Results: ' + priority.key_results.map(kr =>
      `${kr.title} (${kr.current}/${kr.target} ${kr.unit})`
    ).join(', '))
  }

  if (priority.due_date) {
    parts.push(`Due: ${priority.due_date}`)
  }

  if (priority.ai_suggestions.length > 0) {
    parts.push('AI Suggestions: ' + priority.ai_suggestions.slice(0, 3).join('; '))
  }

  return parts.join('. ')
}

/**
 * Generates a text representation of a Goal for embedding/search purposes.
 */
export function goalToEmbeddingText(goal: Goal): string {
  const parts = [
    goal.title,
    goal.description,
    `Progress: ${goal.progress}%`,
  ]

  if (goal.milestones.length > 0) {
    const done = goal.milestones.filter(m => m.done).length
    parts.push(`Milestones: ${done}/${goal.milestones.length} completed`)
    parts.push('Milestones: ' + goal.milestones.map(m =>
      `${m.title} (${m.done ? 'done' : 'pending'})`
    ).join(', '))
  }

  if (goal.target_date) {
    parts.push(`Target: ${goal.target_date}`)
  }

  return parts.join('. ')
}

/**
 * Generates batch embedding texts for all active priorities and goals.
 * Used to sync data to a vector store when Supabase is available.
 */
export function generateBatchEmbeddingTexts(
  priorities: Priority[],
  goals: Goal[],
): Array<{ id: string; type: 'priority' | 'goal'; text: string }> {
  const items: Array<{ id: string; type: 'priority' | 'goal'; text: string }> = []

  for (const p of priorities.filter(p => p.status === 'active')) {
    items.push({ id: p.id, type: 'priority', text: priorityToEmbeddingText(p) })
  }

  for (const g of goals.filter(g => g.progress < 100)) {
    items.push({ id: g.id, type: 'goal', text: goalToEmbeddingText(g) })
  }

  return items
}

/**
 * Simple keyword-based relevance scoring for local (offline) matching.
 * Returns a score between 0 and 1.
 */
export function computeKeywordRelevance(query: string, text: string): number {
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2)
  const textLower = text.toLowerCase()

  if (queryWords.length === 0) return 0

  let matches = 0
  for (const word of queryWords) {
    if (textLower.includes(word)) matches++
  }

  return matches / queryWords.length
}

/**
 * Finds the most relevant priorities for a given query using keyword matching.
 * Used as a local fallback when vector search is unavailable.
 */
export function findRelevantPriorities(
  query: string,
  priorities: Priority[],
  threshold = 0.2,
  limit = 5,
): Array<Priority & { relevance: number }> {
  const scored = priorities
    .filter(p => p.status === 'active')
    .map(p => ({
      ...p,
      relevance: computeKeywordRelevance(query, priorityToEmbeddingText(p)),
    }))
    .filter(p => p.relevance >= threshold)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit)

  return scored
}

/**
 * Finds the most relevant goals for a given query using keyword matching.
 */
export function findRelevantGoals(
  query: string,
  goals: Goal[],
  threshold = 0.2,
  limit = 5,
): Array<Goal & { relevance: number }> {
  const scored = goals
    .filter(g => g.progress < 100)
    .map(g => ({
      ...g,
      relevance: computeKeywordRelevance(query, goalToEmbeddingText(g)),
    }))
    .filter(g => g.relevance >= threshold)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit)

  return scored
}

/**
 * Builds a combined context string from priorities, goals, and persistent objectives for the AI advisor.
 * This is injected into the Consultant's context for every response.
 */
export function buildCombinedRAGContext(
  priorities: Priority[],
  goals: Goal[],
  query: string,
): string {
  const parts: string[] = []

  // Persistent objectives context (always included)
  const persistentCtx = loadPersistentContext()
  if (persistentCtx.objectives.length > 0) {
    parts.push('**User Objectives (always consider):**')
    persistentCtx.objectives.forEach((o, i) => parts.push(`${i + 1}. ${o}`))
  }
  if (persistentCtx.focusAreas.length > 0) {
    parts.push(`**Focus Areas:** ${persistentCtx.focusAreas.join(', ')}`)
  }

  // Priority context - always include all active (not just query-relevant)
  const activePriorities = priorities.filter(p => p.status === 'active')
  if (activePriorities.length > 0) {
    parts.push('**Active Priorities:**')
    const sorted = [...activePriorities].sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 } as const
      return order[a.priority_level] - order[b.priority_level]
    })
    for (const p of sorted) {
      const krText = p.key_results.length > 0
        ? ` [KRs: ${p.key_results.map(k => `${k.title}: ${k.current}/${k.target}`).join(', ')}]`
        : ''
      const due = p.due_date ? ` (due: ${p.due_date})` : ''
      parts.push(`- [${p.priority_level.toUpperCase()}] ${p.title} (${p.progress}%)${due}${krText}`)
    }

    // Additionally highlight query-relevant ones
    const relevant = findRelevantPriorities(query, priorities, 0.3)
    if (relevant.length > 0) {
      parts.push(`**Most relevant to your question:** ${relevant.map(p => `"${p.title}"`).join(', ')}`)
    }
  }

  // Goal context
  const activeGoals = goals.filter(g => g.progress < 100)
  if (activeGoals.length > 0) {
    const relevant = findRelevantGoals(query, goals, 0.1)
    if (relevant.length > 0) {
      parts.push('**Relevant Goals:**')
      for (const g of relevant) {
        const msText = g.milestones.length > 0
          ? ` [${g.milestones.filter(m => m.done).length}/${g.milestones.length} milestones]`
          : ''
        parts.push(`- ${g.title} (${g.progress}%)${msText}`)
      }
    }
  }

  // AI suggestions from priorities
  const withSuggestions = activePriorities.filter(p => p.ai_suggestions.length > 0)
  if (withSuggestions.length > 0) {
    parts.push('**Recent AI Recommendations:**')
    for (const p of withSuggestions.slice(0, 3)) {
      parts.push(`- For "${p.title}": ${p.ai_suggestions[0]}`)
    }
  }

  if (parts.length > 0) {
    parts.push('\n*Always align suggestions with user objectives and active priorities.*')
  }

  return parts.length > 0
    ? parts.join('\n')
    : ''
}

/**
 * Auto-suggests priority level based on goal characteristics.
 */
export function suggestPriorityLevel(
  title: string,
  description: string,
  dueDate?: string,
): 'critical' | 'high' | 'medium' | 'low' {
  const text = `${title} ${description}`.toLowerCase()

  // Urgency keywords
  const urgentKeywords = ['urgent', 'deadline', 'asap', 'critical', 'exam', 'prova', 'concurso', 'emergency']
  const highKeywords = ['important', 'career', 'health', 'finance', 'study', 'estudo', 'project']
  const lowKeywords = ['maybe', 'someday', 'explore', 'nice to have', 'optional']

  if (urgentKeywords.some(k => text.includes(k))) return 'critical'
  if (lowKeywords.some(k => text.includes(k))) return 'low'

  // Check due date proximity
  if (dueDate) {
    const daysUntil = Math.floor((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (daysUntil <= 7) return 'critical'
    if (daysUntil <= 30) return 'high'
  }

  if (highKeywords.some(k => text.includes(k))) return 'high'

  return 'medium'
}

/**
 * Generates smart action suggestions based on current priorities and recent activity.
 * Local-only fallback when AI is unavailable.
 */
export function generateLocalSuggestions(
  priorities: Priority[],
  goals: Goal[],
  opportunities: Array<{ title: string; status: string; type: string; strategic_value: number | null }>,
): string[] {
  const suggestions: string[] = []
  const active = priorities.filter(p => p.status === 'active')

  // Suggest working on highest priority
  if (active.length > 0) {
    const top = active.sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 }
      return order[a.priority_level] - order[b.priority_level]
    })[0]
    suggestions.push(`Focus on "${top.title}" - it's your ${top.priority_level} priority at ${top.progress}%.`)
  }

  // Suggest updating stale key results
  for (const p of active) {
    const incomplete = p.key_results.filter(kr => !kr.done)
    if (incomplete.length > 0) {
      suggestions.push(`Update key result "${incomplete[0].title}" for "${p.title}" (${incomplete[0].current}/${incomplete[0].target} ${incomplete[0].unit}).`)
      break
    }
  }

  // Suggest creating tasks for priorities without related opportunities
  const doingTitles = opportunities.filter(o => o.status === 'doing').map(o => o.title.toLowerCase())
  for (const p of active.slice(0, 3)) {
    const hasRelated = doingTitles.some(t => t.includes(p.title.toLowerCase().split(' ')[0]))
    if (!hasRelated) {
      suggestions.push(`Create a task for priority "${p.title}" - no active tasks found.`)
      break
    }
  }

  // Suggest reviewing goals near completion
  const nearComplete = goals.filter(g => g.progress >= 70 && g.progress < 100)
  if (nearComplete.length > 0) {
    suggestions.push(`Review goal "${nearComplete[0].title}" - it's at ${nearComplete[0].progress}%, almost done!`)
  }

  // General suggestions if we have few
  if (suggestions.length < 2) {
    if (active.length === 0) {
      suggestions.push('Set your first priority to stay focused on what matters most.')
    }
    if (goals.length === 0) {
      suggestions.push('Create goals with milestones to track your long-term progress.')
    }
  }

  return suggestions.slice(0, 5)
}
