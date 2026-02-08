/**
 * Build rich context payload for the AI assistant.
 * Gathers workspace data (opportunities, goals, journal, habits, calendar, XP)
 * so the assistant can give contextual, proactive answers.
 */

import type { Opportunity, DailyLog, CalendarEvent } from '@/types'
import type { Goal, Habit } from '@/hooks/useLocalData'

export interface AssistantContext {
  workspaceId?: string
  workspaceName?: string
  currentPage: string
  recentOpportunities: { id: string; title: string; status: string; type: string; priority: number }[]
  currentGoals: { title: string; progress: number }[]
  lastJournalEntry?: { content: string; mood: string | null; energy_level: number | null; date: string }
  habits: { name: string; streak: number }[]
  todayEvents: { title: string; start: string; category: string }[]
  xp: { level: number; totalXp: number; streak: number }
  stats: {
    totalTasks: number
    doingTasks: number
    doneTasks: number
    backlogTasks: number
  }
}

/**
 * Gather context from the app state for the AI assistant.
 */
export function buildAssistantContext(data: {
  opportunities?: Opportunity[]
  goals?: Goal[]
  dailyLogs?: DailyLog[]
  habits?: Habit[]
  calendarEvents?: CalendarEvent[]
  xpLevel?: number
  xpTotal?: number
  xpStreak?: number
  currentPage?: string
  workspaceName?: string
}): AssistantContext {
  const opps = data.opportunities ?? []
  const goals = data.goals ?? []
  const logs = data.dailyLogs ?? []
  const habits = data.habits ?? []
  const events = data.calendarEvents ?? []

  const today = new Date().toISOString().split('T')[0]

  // Recent opportunities (top 10 by priority, exclude done)
  const recentOpps = [...opps]
    .filter(o => o.status !== 'done')
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 10)
    .map(o => ({ id: o.id, title: o.title, status: o.status, type: o.type, priority: o.priority }))

  // Current goals (in progress, top 5)
  const currentGoals = goals
    .filter(g => g.progress < 100)
    .slice(0, 5)
    .map(g => ({ title: g.title, progress: g.progress }))

  // Last journal entry
  const sortedLogs = [...logs].sort((a, b) => b.created_at.localeCompare(a.created_at))
  const lastLog = sortedLogs[0]

  // Habit streaks (approximate: count consecutive days of completions ending today)
  const habitData = habits.map(h => {
    let streak = 0
    const sorted = [...h.completions].sort().reverse()
    const d = new Date()
    for (const comp of sorted) {
      const expected = d.toISOString().split('T')[0]
      if (comp === expected) {
        streak++
        d.setDate(d.getDate() - 1)
      } else break
    }
    return { name: h.name, streak }
  })

  // Today's calendar events
  const todayEvents = events
    .filter(e => e.start.startsWith(today))
    .map(e => ({ title: e.title, start: e.start, category: e.category }))

  return {
    currentPage: data.currentPage ?? '/',
    workspaceName: data.workspaceName,
    recentOpportunities: recentOpps,
    currentGoals,
    lastJournalEntry: lastLog ? {
      content: lastLog.content,
      mood: lastLog.mood,
      energy_level: lastLog.energy_level,
      date: lastLog.log_date,
    } : undefined,
    habits: habitData,
    todayEvents,
    xp: {
      level: data.xpLevel ?? 1,
      totalXp: data.xpTotal ?? 0,
      streak: data.xpStreak ?? 0,
    },
    stats: {
      totalTasks: opps.length,
      doingTasks: opps.filter(o => o.status === 'doing').length,
      doneTasks: opps.filter(o => o.status === 'done').length,
      backlogTasks: opps.filter(o => o.status === 'backlog').length,
    },
  }
}

/**
 * Convert context to a concise prompt string for the AI model.
 */
export function contextToPrompt(ctx: AssistantContext): string {
  const parts: string[] = []

  if (ctx.workspaceName) parts.push(`Workspace: ${ctx.workspaceName}`)
  parts.push(`Page: ${ctx.currentPage}`)
  parts.push(`Level ${ctx.xp.level} | ${ctx.xp.totalXp} XP | ${ctx.xp.streak}-day streak`)
  parts.push(`Tasks: ${ctx.stats.doingTasks} in progress, ${ctx.stats.backlogTasks} backlog, ${ctx.stats.doneTasks} done (${ctx.stats.totalTasks} total)`)

  if (ctx.recentOpportunities.length) {
    const top = ctx.recentOpportunities.slice(0, 5)
    parts.push('Top tasks: ' + top.map(o => `${o.title} [${o.status}/${o.type}, P${o.priority}]`).join('; '))
  }

  if (ctx.currentGoals.length) {
    parts.push('Goals: ' + ctx.currentGoals.map(g => `${g.title} (${g.progress}%)`).join('; '))
  }

  if (ctx.lastJournalEntry) {
    parts.push(`Last journal (${ctx.lastJournalEntry.date}): mood=${ctx.lastJournalEntry.mood ?? '?'}, energy=${ctx.lastJournalEntry.energy_level ?? '?'}`)
  }

  if (ctx.habits.length) {
    const active = ctx.habits.filter(h => h.streak > 0)
    if (active.length) parts.push('Active habit streaks: ' + active.map(h => `${h.name} (${h.streak}d)`).join(', '))
  }

  if (ctx.todayEvents.length) {
    parts.push('Today\'s schedule: ' + ctx.todayEvents.map(e => `${e.title} @ ${e.start.split('T')[1]?.slice(0, 5) ?? '?'}`).join(', '))
  }

  return parts.join('\n')
}

/**
 * Generate proactive suggestions based on current context.
 */
export function generateProactiveSuggestions(ctx: AssistantContext): string[] {
  const suggestions: string[] = []

  // High priority backlog items
  const highPrioBacklog = ctx.recentOpportunities.filter(o => o.status === 'backlog' && o.priority >= 8)
  if (highPrioBacklog.length > 0) {
    suggestions.push(`You have ${highPrioBacklog.length} high-priority task${highPrioBacklog.length > 1 ? 's' : ''} in backlog. Want to start "${highPrioBacklog[0].title}"?`)
  }

  // Low energy warning
  if (ctx.lastJournalEntry?.energy_level != null && ctx.lastJournalEntry.energy_level <= 3) {
    suggestions.push('Your last journal shows low energy. Consider scheduling a lighter day or a break.')
  }

  // Streak maintenance
  if (ctx.xp.streak >= 3) {
    suggestions.push(`Keep your ${ctx.xp.streak}-day streak going! Log a journal entry or complete a task.`)
  }

  // No journal today
  if (ctx.lastJournalEntry && ctx.lastJournalEntry.date !== new Date().toISOString().split('T')[0]) {
    suggestions.push('You haven\'t journaled today yet. How about a quick check-in?')
  }

  // Too many doing tasks
  if (ctx.stats.doingTasks > 5) {
    suggestions.push(`You have ${ctx.stats.doingTasks} tasks in progress. Consider finishing some before starting new ones.`)
  }

  // Goals nearing completion
  const nearComplete = ctx.currentGoals.filter(g => g.progress >= 80)
  if (nearComplete.length > 0) {
    suggestions.push(`"${nearComplete[0].title}" is ${nearComplete[0].progress}% done! A little push and it's complete.`)
  }

  return suggestions.slice(0, 3)
}
