import { useState, useCallback } from 'react'
import { parseAssistantIntent, executeAssistantAction } from '@/lib/ai/assistant-actions'
import { buildAssistantContext, contextToPrompt } from '@/lib/ai/context-builder'

export interface AssistantMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export function useAssistant(initialContext?: { recentOpportunities?: { id: string; title: string }[]; currentGoals?: string[] }) {
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hi! I can help you create tasks, log to journal, or open pages. Try "create task Review docs" or "open analytics".',
      timestamp: new Date(),
    },
  ])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const ctx = buildAssistantContext({
    recentOpportunities: initialContext?.recentOpportunities ?? [],
    currentGoals: initialContext?.currentGoals ?? [],
  })

  const send = useCallback(async (content: string) => {
    const userMsg: AssistantMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    }
    setMessages(m => [...m, userMsg])
    setLoading(true)

    const intent = parseAssistantIntent(content)
    const result = await executeAssistantAction(intent)

    let reply = result.message ?? "I'm not sure how to do that. You can ask to create a task, add a journal entry, or open a page."
    if (intent.type === 'none') {
      reply = `Context: ${contextToPrompt(ctx).slice(0, 200)}. You said: "${content}". I can create tasks, log journal, or open pages.`
    }

    const assistantMsg: AssistantMessage = {
      id: `a-${Date.now()}`,
      role: 'assistant',
      content: reply,
      timestamp: new Date(),
    }
    setMessages(m => [...m, assistantMsg])
    setLoading(false)
  }, [ctx])

  return { messages, send, open, setOpen, loading }
}
