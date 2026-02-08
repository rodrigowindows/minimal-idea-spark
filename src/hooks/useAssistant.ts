import { useState, useCallback, useMemo, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { parseAssistantIntent, executeAssistantAction, type ActionCallbacks } from '@/lib/ai/assistant-actions'
import { buildAssistantContext, contextToPrompt, generateProactiveSuggestions, type AssistantContext } from '@/lib/ai/context-builder'
import { useLocalData } from '@/hooks/useLocalData'
import { useCalendarEvents } from '@/hooks/useCalendarEvents'
import { useXPSystem } from '@/hooks/useXPSystem'
import { useAppContext } from '@/contexts/AppContext'
import { supabase } from '@/integrations/supabase/client'

// ---------- Types ----------

export type AssistantPersona = 'assistant' | 'coach' | 'planner' | 'motivator'

export interface AssistantMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  action?: string
}

export interface ConversationThread {
  id: string
  title: string
  messages: AssistantMessage[]
  persona: AssistantPersona
  createdAt: string
  updatedAt: string
}

// ---------- Constants ----------

const STORAGE_KEY = 'lifeos_assistant_threads'
const ACTIVE_THREAD_KEY = 'lifeos_assistant_active_thread'
const MAX_THREADS = 50

const PERSONA_CONFIG: Record<AssistantPersona, { name: string; welcome: string; systemPrompt: string }> = {
  assistant: {
    name: 'Assistant',
    welcome: 'Hi! I can help you manage tasks, log journals, navigate pages, and more. Try commands like /task, /journal, /focus, or just tell me what you need.',
    systemPrompt: 'You are a helpful second-brain assistant for a productivity app called Canvas/LifeOS. Help users manage tasks, journal entries, goals, habits, and schedule. Keep replies concise and actionable.',
  },
  coach: {
    name: 'Coach',
    welcome: "Hey! I'm your productivity coach. Tell me what you want to accomplish and I'll help you break it down and stay on track. What's your focus today?",
    systemPrompt: 'You are a supportive productivity coach. Help users set priorities, break down goals, maintain streaks, and stay focused. Be encouraging but direct. Suggest specific actions.',
  },
  planner: {
    name: 'Planner',
    welcome: "Hello! I'm your strategic planner. I'll help you organize your day, schedule tasks, and balance your life domains. What would you like to plan?",
    systemPrompt: 'You are a strategic life planner. Help users organize their schedule, balance life domains, plan weekly goals, and optimize their time. Give structured advice.',
  },
  motivator: {
    name: 'Motivator',
    welcome: "Let's go! I'm here to keep your energy up and your momentum strong. What challenge are you tackling today?",
    systemPrompt: 'You are an energetic motivator. Celebrate wins, encourage consistency, help users push through resistance, and maintain positive momentum. Use enthusiasm but stay authentic.',
  },
}

export const QUICK_COMMANDS = [
  { label: '/task', hint: 'Create task', icon: 'plus' },
  { label: '/journal', hint: 'Log journal', icon: 'book' },
  { label: '/focus', hint: 'Deep Work', icon: 'target' },
  { label: '/stats', hint: 'My stats', icon: 'bar-chart' },
  { label: '/open', hint: 'Navigate', icon: 'compass' },
  { label: '/search', hint: 'Search', icon: 'search' },
  { label: '/habit', hint: 'New habit', icon: 'repeat' },
] as const

// ---------- Persistence ----------

function loadThreads(): ConversationThread[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  return []
}

function saveThreads(threads: ConversationThread[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(threads.slice(0, MAX_THREADS)))
}

function loadActiveThreadId(): string | null {
  return localStorage.getItem(ACTIVE_THREAD_KEY)
}

function saveActiveThreadId(id: string) {
  localStorage.setItem(ACTIVE_THREAD_KEY, id)
}

function createThread(persona: AssistantPersona): ConversationThread {
  const now = new Date().toISOString()
  return {
    id: `thread-${Date.now()}`,
    title: 'New conversation',
    persona,
    messages: [{
      id: 'welcome',
      role: 'assistant',
      content: PERSONA_CONFIG[persona].welcome,
      timestamp: new Date(),
    }],
    createdAt: now,
    updatedAt: now,
  }
}

// ---------- Hook ----------

export function useAssistant() {
  const navigate = useNavigate()
  const location = useLocation()
  const { opportunities, dailyLogs, goals, habits, addOpportunity, addDailyLog, addHabit } = useLocalData()
  const { events } = useCalendarEvents()
  const xp = useXPSystem()
  const { toggleDeepWorkMode } = useAppContext()

  // Thread state
  const [threads, setThreads] = useState<ConversationThread[]>(loadThreads)
  const [activeThreadId, setActiveThreadId] = useState<string | null>(() => {
    const saved = loadActiveThreadId()
    const existing = loadThreads()
    if (saved && existing.some(t => t.id === saved)) return saved
    if (existing.length > 0) return existing[0].id
    return null
  })

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Build context
  const ctx: AssistantContext = useMemo(() => buildAssistantContext({
    opportunities,
    goals,
    dailyLogs,
    habits,
    calendarEvents: events,
    xpLevel: xp.level,
    xpTotal: xp.xpTotal,
    xpStreak: xp.streakDays,
    currentPage: location.pathname,
  }), [opportunities, goals, dailyLogs, habits, events, xp.level, xp.xpTotal, xp.streakDays, location.pathname])

  // Proactive suggestions
  const suggestions = useMemo(() => generateProactiveSuggestions(ctx), [ctx])

  // Current thread
  const activeThread = useMemo(() =>
    threads.find(t => t.id === activeThreadId) ?? null,
    [threads, activeThreadId]
  )

  const messages = activeThread?.messages ?? []
  const currentPersona = activeThread?.persona ?? 'assistant'

  // Persist threads
  useEffect(() => { saveThreads(threads) }, [threads])
  useEffect(() => { if (activeThreadId) saveActiveThreadId(activeThreadId) }, [activeThreadId])

  // Action callbacks
  const actionCallbacks: ActionCallbacks = useMemo(() => ({
    addOpportunity: (data) => addOpportunity(data as Parameters<typeof addOpportunity>[0]),
    addDailyLog: (data) => addDailyLog(data as Parameters<typeof addDailyLog>[0]),
    navigate: (path: string) => navigate(path),
    startDeepWork: () => toggleDeepWorkMode(),
    addHabit: (data) => addHabit(data as Parameters<typeof addHabit>[0]),
  }), [addOpportunity, addDailyLog, navigate, toggleDeepWorkMode, addHabit])

  // Format stats message
  const formatStatsMessage = useCallback((): string => {
    return [
      `**Your Stats**`,
      `Level ${ctx.xp.level} | ${ctx.xp.totalXp} XP | ${ctx.xp.streak}-day streak`,
      `Tasks: ${ctx.stats.doingTasks} in progress, ${ctx.stats.backlogTasks} backlog, ${ctx.stats.doneTasks} completed`,
      ctx.currentGoals.length > 0
        ? `Goals: ${ctx.currentGoals.map(g => `${g.title} (${g.progress}%)`).join(', ')}`
        : 'No active goals',
      ctx.todayEvents.length > 0
        ? `Today: ${ctx.todayEvents.length} event(s)`
        : 'No events today',
    ].join('\n')
  }, [ctx])

  // Search opportunities/logs
  const searchContent = useCallback((query: string): string => {
    const q = query.toLowerCase()
    const matchedOpps = opportunities.filter(o =>
      o.title.toLowerCase().includes(q) || o.description?.toLowerCase().includes(q)
    ).slice(0, 5)
    const matchedLogs = dailyLogs.filter(l =>
      l.content.toLowerCase().includes(q)
    ).slice(0, 3)

    const parts: string[] = []
    if (matchedOpps.length) {
      parts.push('**Tasks found:**')
      matchedOpps.forEach(o => parts.push(`- ${o.title} [${o.status}]`))
    }
    if (matchedLogs.length) {
      parts.push('**Journal entries found:**')
      matchedLogs.forEach(l => parts.push(`- ${l.log_date}: ${l.content.slice(0, 80)}...`))
    }
    if (!parts.length) parts.push(`No results for "${query}".`)
    return parts.join('\n')
  }, [opportunities, dailyLogs])

  // AI response via edge function (with fallback)
  const getAIResponse = useCallback(async (
    userContent: string,
    threadMessages: AssistantMessage[],
    persona: AssistantPersona
  ): Promise<string> => {
    try {
      const contextStr = contextToPrompt(ctx)
      const systemPrompt = PERSONA_CONFIG[persona].systemPrompt
      const history = threadMessages
        .filter(m => m.role !== 'system')
        .slice(-10)
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

      const { data, error } = await supabase.functions.invoke('assistant-chat', {
        body: {
          messages: [...history, { role: 'user', content: userContent }],
          context: `${systemPrompt}\n\nUser context:\n${contextStr}`,
        },
      })

      if (error) throw error
      return data?.reply ?? 'I understand. How can I help further?'
    } catch {
      // Fallback: give contextual local response
      return generateLocalResponse(userContent, ctx, persona)
    }
  }, [ctx])

  // Send message
  const send = useCallback(async (content: string) => {
    if (!content.trim()) return

    let thread = activeThread
    if (!thread) {
      thread = createThread('assistant')
      setThreads(prev => [thread!, ...prev])
      setActiveThreadId(thread.id)
    }

    const userMsg: AssistantMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    }

    setThreads(prev => prev.map(t =>
      t.id === thread!.id
        ? { ...t, messages: [...t.messages, userMsg], updatedAt: new Date().toISOString() }
        : t
    ))

    setLoading(true)

    // Parse intent
    const intent = parseAssistantIntent(content)
    const result = executeAssistantAction(intent, actionCallbacks)

    let reply: string

    if (intent.type !== 'none') {
      // Handle special responses
      if (result.message === '__show_stats__') {
        reply = formatStatsMessage()
      } else if (result.message.startsWith('__search__:')) {
        const query = result.message.replace('__search__:', '')
        reply = searchContent(query)
      } else {
        reply = result.message
      }
    } else {
      // No recognized action — ask AI
      reply = await getAIResponse(content, thread.messages, thread.persona)
    }

    const assistantMsg: AssistantMessage = {
      id: `a-${Date.now()}`,
      role: 'assistant',
      content: reply,
      timestamp: new Date(),
      action: intent.type !== 'none' ? intent.type : undefined,
    }

    // Update thread title from first user message
    setThreads(prev => prev.map(t => {
      if (t.id !== thread!.id) return t
      const updated = {
        ...t,
        messages: [...t.messages, userMsg, assistantMsg].filter((m, i, arr) =>
          arr.findIndex(x => x.id === m.id) === i
        ),
        updatedAt: new Date().toISOString(),
      }
      if (updated.title === 'New conversation' && content.length > 3) {
        updated.title = content.slice(0, 50) + (content.length > 50 ? '...' : '')
      }
      return updated
    }))

    setLoading(false)
  }, [activeThread, actionCallbacks, formatStatsMessage, searchContent, getAIResponse])

  // Thread management
  const newThread = useCallback((persona?: AssistantPersona) => {
    const thread = createThread(persona ?? currentPersona)
    setThreads(prev => [thread, ...prev])
    setActiveThreadId(thread.id)
  }, [currentPersona])

  const switchThread = useCallback((id: string) => {
    setActiveThreadId(id)
  }, [])

  const deleteThread = useCallback((id: string) => {
    setThreads(prev => {
      const filtered = prev.filter(t => t.id !== id)
      if (activeThreadId === id) {
        setActiveThreadId(filtered[0]?.id ?? null)
      }
      return filtered
    })
  }, [activeThreadId])

  const setPersona = useCallback((persona: AssistantPersona) => {
    if (!activeThread) {
      newThread(persona)
      return
    }
    setThreads(prev => prev.map(t =>
      t.id === activeThread.id ? { ...t, persona } : t
    ))
  }, [activeThread, newThread])

  const clearHistory = useCallback(() => {
    setThreads([])
    setActiveThreadId(null)
  }, [])

  return {
    // Chat state
    messages,
    send,
    open,
    setOpen,
    loading,

    // Persona
    persona: currentPersona,
    setPersona,
    personaConfig: PERSONA_CONFIG,

    // Threads
    threads,
    activeThreadId,
    newThread,
    switchThread,
    deleteThread,
    clearHistory,

    // Context & suggestions
    context: ctx,
    suggestions,
    quickCommands: QUICK_COMMANDS,
  }
}

// ---------- Local fallback AI response ----------

function generateLocalResponse(
  input: string,
  ctx: AssistantContext,
  persona: AssistantPersona
): string {
  const lower = input.toLowerCase()

  // Greetings
  if (/^(hi|hello|hey|oi|ol[áa]|bom dia|boa (?:tarde|noite))[\s!.]*$/i.test(input)) {
    const greetings: Record<AssistantPersona, string> = {
      assistant: `Hello! You're Level ${ctx.xp.level} with ${ctx.stats.doingTasks} tasks in progress. How can I help?`,
      coach: `Hey there, Level ${ctx.xp.level}! ${ctx.xp.streak > 0 ? `Great ${ctx.xp.streak}-day streak going!` : "Let's start a new streak today!"} What's the plan?`,
      planner: `Good day! You have ${ctx.stats.doingTasks} tasks in progress and ${ctx.todayEvents.length} events today. What should we focus on?`,
      motivator: `Let's go! You're Level ${ctx.xp.level} with ${ctx.xp.totalXp} XP. ${ctx.xp.streak > 0 ? `${ctx.xp.streak}-day streak, keep it up!` : "Today's a great day to start fresh!"}`,
    }
    return greetings[persona]
  }

  // Task-related questions
  if (lower.includes('task') || lower.includes('tarefa') || lower.includes('what should')) {
    if (ctx.recentOpportunities.length > 0) {
      const top = ctx.recentOpportunities[0]
      return `Your highest priority task is "${top.title}" (P${top.priority}, ${top.status}). You have ${ctx.stats.doingTasks} tasks in progress. Use /task to create a new one.`
    }
    return 'You have no active tasks. Use "/task Your task name" to create one!'
  }

  // Goal questions
  if (lower.includes('goal') || lower.includes('meta')) {
    if (ctx.currentGoals.length > 0) {
      return 'Your active goals:\n' + ctx.currentGoals.map(g => `- ${g.title}: ${g.progress}%`).join('\n')
    }
    return 'No active goals. Head to /goals to set some!'
  }

  // Mood/energy questions
  if (lower.includes('mood') || lower.includes('energy') || lower.includes('humor') || lower.includes('energia')) {
    if (ctx.lastJournalEntry) {
      return `Your last journal (${ctx.lastJournalEntry.date}): mood was "${ctx.lastJournalEntry.mood ?? 'not set'}", energy ${ctx.lastJournalEntry.energy_level ?? '?'}/10. Use /journal to log today's entry.`
    }
    return "No recent journal entries. Use /journal to log how you're feeling!"
  }

  // Schedule questions
  if (lower.includes('schedule') || lower.includes('agenda') || lower.includes('today') || lower.includes('hoje')) {
    if (ctx.todayEvents.length > 0) {
      return "Today's schedule:\n" + ctx.todayEvents.map(e =>
        `- ${e.title} at ${e.start?.split('T')[1]?.slice(0, 5) ?? '?'}`
      ).join('\n')
    }
    return 'Nothing scheduled for today. Head to /calendar to plan your day!'
  }

  // Help
  if (lower.includes('help') || lower.includes('ajuda') || lower.includes('what can')) {
    return [
      'I can help you with:',
      '- **/task** "name" - Create a new task',
      '- **/journal** your entry - Log to journal',
      '- **/focus** - Start Deep Work mode',
      '- **/stats** - View your stats',
      '- **/open** page - Navigate to a page',
      '- **/search** query - Search your data',
      '- **/habit** "name" - Create a habit',
      'Or just ask me anything about your tasks, goals, or schedule!',
    ].join('\n')
  }

  // Default contextual response
  const tips: string[] = []
  if (ctx.stats.doingTasks > 0) tips.push(`You have ${ctx.stats.doingTasks} tasks in progress.`)
  if (ctx.xp.streak > 0) tips.push(`${ctx.xp.streak}-day streak going strong!`)
  if (ctx.todayEvents.length > 0) tips.push(`${ctx.todayEvents.length} event(s) today.`)

  return `I'm not sure how to help with that specifically, but here's what I know:\n${tips.length > 0 ? tips.join(' ') : `You're Level ${ctx.xp.level} with ${ctx.xp.totalXp} XP.`}\n\nType /help to see what I can do!`
}
