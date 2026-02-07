import { useState, useCallback, useMemo } from 'react'
import { parseAssistantIntent, executeAssistantAction } from '@/lib/ai/assistant-actions'
import { buildAssistantContext, contextToPrompt } from '@/lib/ai/context-builder'

export type AssistantPersona = 'assistant' | 'coach' | 'planner'

const PERSONA_WELCOME: Record<AssistantPersona, string> = {
  assistant: 'Hi! I can help you create tasks, log to journal, or open pages. Try "create task Review docs" or "open analytics".',
  coach: "Hey! I'm your focus coach. Tell me what you want to accomplish and I'll help you break it down. Try /task or just describe your next step.",
  planner: "Hello! I'm your planner. I can add tasks, schedule items, and open your dashboard. Use shortcuts: /task, /journal, /open dashboard.",
}

export interface AssistantMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export const QUICK_COMMANDS = [
  { label: '/task', hint: 'Create task' },
  { label: '/journal', hint: 'Log journal' },
  { label: '/open dashboard', hint: 'Go to dashboard' },
  { label: '/open analytics', hint: 'Go to analytics' },
] as const

export function useAssistant(initialContext?: {
  recentOpportunities?: { id: string; title: string }[]
  currentGoals?: string[]
  persona?: AssistantPersona
}) {
  const persona: AssistantPersona = initialContext?.persona ?? 'assistant'
  const [messages, setMessages] = useState<AssistantMessage[]>(() => [
    { id: 'welcome', role: 'assistant', content: PERSONA_WELCOME[persona], timestamp: new Date() },
  ])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [currentPersona, setCurrentPersona] = useState<AssistantPersona>(persona)

  const ctx = useMemo(
    () => buildAssistantContext({
      recentOpportunities: initialContext?.recentOpportunities ?? [],
      currentGoals: initialContext?.currentGoals ?? [],
    }),
    [initialContext?.recentOpportunities, initialContext?.currentGoals]
  )

  const proactiveSuggestion = useMemo(() => {
    const tasks = initialContext?.recentOpportunities ?? []
    if (tasks.length > 2) return 'You have several tasks. Say "create task [name]" to add another, or "open opportunities" to manage them.'
    if (tasks.length > 0) return 'Say "open opportunities" to see your tasks, or "create task X" to add one.'
    return 'Try "create task Review project" or "open dashboard".'
  }, [initialContext?.recentOpportunities])

  const send = useCallback(async (content: string) => {
    const userMsg: AssistantMessage = { id: `u-${Date.now()}`, role: 'user', content, timestamp: new Date() }
    setMessages(m => [...m, userMsg])
    setLoading(true)
    const intent = parseAssistantIntent(content)
    const result = await executeAssistantAction(intent)
    let reply = result.message ?? "I'm not sure how to do that. You can ask to create a task, add a journal entry, or open a page."
    if (intent.type === 'none') {
      reply = `Context: ${contextToPrompt(ctx).slice(0, 200)}. You said: "${content}". I can create tasks, log journal, or open pages.`
    }
    const assistantMsg: AssistantMessage = { id: `a-${Date.now()}`, role: 'assistant', content: reply, timestamp: new Date() }
    setMessages(m => [...m, assistantMsg])
    setLoading(false)
  }, [ctx])

  return { messages, send, open, setOpen, loading, persona: currentPersona, setPersona: setCurrentPersona, proactiveSuggestion, quickCommands: QUICK_COMMANDS }
}
