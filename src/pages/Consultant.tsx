import { useState, useRef, useEffect, useMemo } from 'react'
import type { ChatMessage as ChatMessageType, ContextSource } from '@/types'
import { ChatMessage } from '@/components/consultant/ChatMessage'
import { ChatInput } from '@/components/consultant/ChatInput'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Sparkles, Brain, Zap } from 'lucide-react'
import { useMockData } from '@/hooks/useMockData'
import { useXPSystem } from '@/hooks/useXPSystem'

function generateContextualResponse(query: string, opportunities: any[], deepWorkMinutes: number, streakDays: number) {
  const lower = query.toLowerCase()
  const doingTasks = opportunities.filter(o => o.status === 'doing')
  const highPriority = opportunities.filter(o => o.priority >= 7).sort((a, b) => (b.strategic_value ?? 0) - (a.strategic_value ?? 0))

  if (lower.includes('priorit') || lower.includes('today') || lower.includes('what should')) {
    const top = highPriority[0]
    return {
      content: top
        ? `Based on strategic value analysis, I recommend focusing on "${top.title}" (${top.type}, SV: ${top.strategic_value}/10). This will yield the highest XP return. You currently have ${doingTasks.length} tasks in progress. Consider using Deep Work mode for a focused 25-minute Pomodoro session.`
        : `You have ${opportunities.length} opportunities in your backlog. Start by moving one high-value item to "Doing" status and activating Deep Work mode.`,
      sources: [
        { title: 'Opportunity Analysis', type: 'opportunity' as const, relevance: 0.95 },
        { title: 'Strategic Value Ranking', type: 'knowledge' as const, relevance: 0.88 },
      ],
    }
  }

  if (lower.includes('tired') || lower.includes('energy') || lower.includes('cansaço') || lower.includes('burnout')) {
    const deepHours = Math.floor(deepWorkMinutes / 60)
    return {
      content: `Your deep work total is ${deepHours}h this period. ${deepHours > 8 ? 'That is quite intensive - consider lighter tasks or a break.' : 'You have capacity for more deep work.'} Your streak is at ${streakDays} days. For energy management, try: 1) Switch to low-strategic-value tasks, 2) Do a 5-min break walk, 3) Journal about your current state.`,
      sources: [
        { title: 'Deep Work History', type: 'journal' as const, relevance: 0.92 },
        { title: 'Energy Patterns', type: 'journal' as const, relevance: 0.85 },
      ],
    }
  }

  if (lower.includes('balance') || lower.includes('domain') || lower.includes('equilibr')) {
    const domainCounts: Record<string, number> = {}
    opportunities.forEach(o => {
      const d = o.domain?.name || 'Other'
      domainCounts[d] = (domainCounts[d] || 0) + 1
    })
    const breakdown = Object.entries(domainCounts).map(([k, v]) => `${k}: ${v}`).join(', ')
    return {
      content: `Current domain distribution: ${breakdown}. Check the Balance Radar on your dashboard for a visual breakdown. If any domain exceeds 40%, you may be overinvesting there at the cost of others.`,
      sources: [
        { title: 'Domain Analysis', type: 'opportunity' as const, relevance: 0.9 },
        { title: 'Balance Guidelines', type: 'knowledge' as const, relevance: 0.82 },
      ],
    }
  }

  return {
    content: `I have access to ${opportunities.length} opportunities and your activity history. I can help with: prioritization, energy management, domain balance analysis, or strategic planning. What aspect would you like to explore?`,
    sources: [
      { title: 'System Overview', type: 'knowledge' as const, relevance: 0.7 },
    ],
  }
}

export function Consultant() {
  const { opportunities } = useMockData()
  const { deepWorkMinutes, streakDays } = useXPSystem()
  const [messages, setMessages] = useState<ChatMessageType[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello! I'm your Strategic Advisor. I analyze your opportunities, focus sessions, and journal to provide data-driven recommendations. Try asking: \"What should I prioritize today?\" or \"Am I balanced across domains?\"",
      timestamp: new Date(),
    },
  ])
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  async function handleSend(content: string) {
    const userMessage: ChatMessageType = {
      id: `user-${Date.now()}`, role: 'user', content, timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMessage])
    setIsTyping(true)

    await new Promise(resolve => setTimeout(resolve, 1500))

    const response = generateContextualResponse(content, opportunities || [], deepWorkMinutes, streakDays)
    const assistantMessage: ChatMessageType = {
      id: `assistant-${Date.now()}`, role: 'assistant',
      content: response.content, timestamp: new Date(),
      sources: response.sources as ContextSource[],
    }
    setMessages(prev => [...prev, assistantMessage])
    setIsTyping(false)
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col p-4 md:h-screen md:p-6 lg:p-8">
      <header className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Brain className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Strategic Advisor</h1>
          <p className="text-sm text-muted-foreground">AI-powered insights from your second brain (RAG)</p>
        </div>
      </header>

      <ScrollArea className="flex-1 pr-4">
        <div className="space-y-6 pb-4">
          {messages.map(message => <ChatMessage key={message.id} message={message} />)}
          {isTyping && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
                <Sparkles className="h-4 w-4 text-secondary-foreground" />
              </div>
              <div className="space-y-2 pt-2">
                <Skeleton className="h-4 w-48" /><Skeleton className="h-4 w-32" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="mt-4 border-t border-border pt-4">
        <div className="mb-2 flex flex-wrap gap-2">
          {['What should I prioritize today?', 'Am I balanced across domains?', 'I feel tired, what now?'].map(q => (
            <button key={q} onClick={() => handleSend(q)} disabled={isTyping}
              className="rounded-full border border-border/50 bg-card/50 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50">
              {q}
            </button>
          ))}
        </div>
        <ChatInput onSend={handleSend} disabled={isTyping} />
      </div>
    </div>
  )
}
