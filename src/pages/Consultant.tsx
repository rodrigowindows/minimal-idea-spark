import { useState, useRef, useEffect } from 'react'
import type { ChatMessage as ChatMessageType, ContextSource } from '@/types'
import { ChatMessage } from '@/components/consultant/ChatMessage'
import { ChatInput } from '@/components/consultant/ChatInput'
import { SourcesUsed } from '@/components/consultant/SourcesUsed'
import { MarkdownContent } from '@/components/consultant/MarkdownContent'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Sparkles, Brain, Wifi, WifiOff, RotateCcw, Trash2, AlertCircle } from 'lucide-react'
import { useLocalData } from '@/hooks/useLocalData'
import { useXPSystem } from '@/hooks/useXPSystem'
import { useRagChat } from '@/hooks/useRagChat'
import { usePriorities } from '@/hooks/usePriorities'
import { calculateXPReward } from '@/lib/constants'
import { Badge } from '@/components/ui/badge'
import type { Opportunity } from '@/types'
import { buildCombinedRAGContext } from '@/lib/rag/goal-embeddings'

function generateContextualResponse(
  query: string,
  opportunities: Opportunity[],
  deepWorkMinutes: number,
  streakDays: number,
  dailyLogs: any[],
  habits: any[],
  goals: any[],
  priorityContext?: string,
) {
  const lower = query.toLowerCase()
  const doingTasks = opportunities.filter(o => o.status === 'doing')
  const highPriority = opportunities.filter(o => o.priority >= 7).sort((a, b) => (b.strategic_value ?? 0) - (a.strategic_value ?? 0))
  const doneTasks = opportunities.filter(o => o.status === 'done')
  const backlogTasks = opportunities.filter(o => o.status === 'backlog')

  // Priority context prefix - always included when available
  const ctxPrefix = priorityContext ? `\n\n---\n*Context from your priorities:*\n${priorityContext}\n---\n\n` : ''

  // Priority / Today
  if (lower.includes('priorit') || lower.includes('today') || lower.includes('what should') || lower.includes('foco') || lower.includes('focus')) {
    const top = highPriority[0]
    const topXP = top ? calculateXPReward(top.type, top.strategic_value ?? 5) : 0
    return {
      content: (top
        ? `Based on strategic value analysis, I recommend focusing on **"${top.title}"** (${top.type}, SV: ${top.strategic_value}/10, worth **${topXP} XP**). You currently have ${doingTasks.length} tasks in progress and ${backlogTasks.length} in backlog. Consider using Deep Work mode for a focused 25-minute Pomodoro session to maximize your XP gains.`
        : `You have ${opportunities.length} opportunities total. Start by moving a high-value item from backlog to "Doing" and activating Deep Work mode.`) + ctxPrefix,
      sources: [
        { title: 'Opportunity Analysis', type: 'opportunity' as const, relevance: 0.95 },
        { title: 'Priority Context', type: 'knowledge' as const, relevance: 0.92 },
        { title: 'Strategic Value Ranking', type: 'knowledge' as const, relevance: 0.88 },
      ],
    }
  }

  // Energy / Tiredness
  if (lower.includes('tired') || lower.includes('energy') || lower.includes('cansaço') || lower.includes('burnout') || lower.includes('cansado')) {
    const deepHours = Math.floor(deepWorkMinutes / 60)
    const recentMoods = dailyLogs.slice(0, 3).map(l => l.mood).filter(Boolean)
    const moodSummary = recentMoods.length > 0 ? `Your recent moods: ${recentMoods.join(', ')}.` : ''
    return {
      content: `Your deep work total is **${deepHours}h**. ${deepHours > 8 ? 'That is quite intensive - consider lighter tasks or a break.' : 'You still have capacity for focused work.'} ${moodSummary} Your streak is at **${streakDays} days**. Energy management tips:\n\n1. Switch to low-SV tasks (networking, small actions)\n2. Take a 5-min walk\n3. Write a quick journal entry about how you feel\n4. Try a shorter 15-min Pomodoro instead of 25`,
      sources: [
        { title: 'Deep Work History', type: 'journal' as const, relevance: 0.92 },
        { title: 'Energy Patterns', type: 'journal' as const, relevance: 0.85 },
      ],
    }
  }

  // Domain balance
  if (lower.includes('balance') || lower.includes('domain') || lower.includes('equilibr') || lower.includes('radar')) {
    const domainCounts: Record<string, number> = {}
    opportunities.forEach(o => {
      const d = o.domain?.name || 'Other'
      domainCounts[d] = (domainCounts[d] || 0) + 1
    })
    const total = Object.values(domainCounts).reduce((s, v) => s + v, 0)
    const breakdown = Object.entries(domainCounts)
      .map(([k, v]) => `${k}: ${v} (${Math.round((v / total) * 100)}%)`)
      .join(', ')
    const max = Object.entries(domainCounts).sort((a, b) => b[1] - a[1])[0]
    const maxPct = max ? Math.round((max[1] / total) * 100) : 0
    const warning = maxPct > 40 ? `\n\n**Warning:** ${max[0]} is at ${maxPct}% - this exceeds the 40% balance threshold. Consider redistributing effort.` : ''
    return {
      content: `Current domain distribution: ${breakdown}.${warning}\n\nCheck the Balance Radar on your dashboard for a visual breakdown.`,
      sources: [
        { title: 'Domain Analysis', type: 'opportunity' as const, relevance: 0.9 },
        { title: 'Balance Guidelines', type: 'knowledge' as const, relevance: 0.82 },
      ],
    }
  }

  // Goals
  if (lower.includes('goal') || lower.includes('meta') || lower.includes('objective')) {
    if (goals.length === 0) {
      return {
        content: 'You haven\'t set any goals yet. I recommend creating 2-3 strategic goals with clear milestones. Go to the Goals page to get started. Focus on outcomes, not activities.',
        sources: [{ title: 'Goal Setting', type: 'knowledge' as const, relevance: 0.9 }],
      }
    }
    const activeGoals = goals.filter((g: any) => g.progress < 100)
    const summary = activeGoals.map((g: any) => `"${g.title}" (${g.progress}%)`).join(', ')
    return {
      content: `You have **${activeGoals.length} active goals**: ${summary}. Focus on the goal closest to completion to build momentum, or the most strategic one to maximize long-term impact.`,
      sources: [
        { title: 'Goal Progress', type: 'knowledge' as const, relevance: 0.95 },
        { title: 'Strategic Planning', type: 'knowledge' as const, relevance: 0.85 },
      ],
    }
  }

  // Habits
  if (lower.includes('habit') || lower.includes('hábito') || lower.includes('routine') || lower.includes('rotina')) {
    if (habits.length === 0) {
      return {
        content: 'No habits tracked yet. Start with 1-3 keystone habits like morning exercise, reading, or journaling. Small daily wins compound over time.',
        sources: [{ title: 'Habit Formation', type: 'knowledge' as const, relevance: 0.9 }],
      }
    }
    const today = new Date().toISOString().split('T')[0]
    const completedToday = habits.filter((h: any) => h.completions?.includes(today)).length
    return {
      content: `You're tracking **${habits.length} habits**. Today: ${completedToday}/${habits.length} completed. ${completedToday === habits.length ? 'Amazing - 100% completion!' : 'Complete your remaining habits to maintain your streak.'} Each habit completion earns +10 XP.`,
      sources: [
        { title: 'Habit Tracking', type: 'knowledge' as const, relevance: 0.9 },
      ],
    }
  }

  // XP / Level / Progress
  if (lower.includes('xp') || lower.includes('level') || lower.includes('progress') || lower.includes('progresso')) {
    const totalXP = doneTasks.reduce((sum, o) => sum + calculateXPReward(o.type, o.strategic_value ?? 5), 0)
    return {
      content: `You've completed **${doneTasks.length} opportunities** worth approximately **${totalXP} XP** from tasks alone. Your streak is **${streakDays} days**. Deep work has contributed **${Math.floor(deepWorkMinutes / 25) * 50} XP** from Pomodoro sessions. To level up faster, focus on high-SV Study tasks (50 base XP * SV) - they yield the most XP.`,
      sources: [
        { title: 'XP Breakdown', type: 'knowledge' as const, relevance: 0.95 },
        { title: 'Level Progress', type: 'knowledge' as const, relevance: 0.9 },
      ],
    }
  }

  // Study / Exam
  if (lower.includes('study') || lower.includes('estudo') || lower.includes('exam') || lower.includes('concurso') || lower.includes('prova')) {
    const studyTasks = opportunities.filter(o => o.type === 'study' && o.status !== 'done')
    const topStudy = studyTasks.sort((a, b) => (b.strategic_value ?? 0) - (a.strategic_value ?? 0))[0]
    return {
      content: topStudy
        ? `You have **${studyTasks.length} study tasks** pending. Top priority: **"${topStudy.title}"** (SV: ${topStudy.strategic_value}/10, worth ${calculateXPReward('study', topStudy.strategic_value ?? 5)} XP). Study tasks yield the highest XP (50 base * SV). Use Deep Work mode with 25-min Pomodoros for maximum retention.`
        : `No active study tasks. Create one for your most important learning goal and set a high strategic value (8-10) to reflect its importance.`,
      sources: [
        { title: 'Study Analysis', type: 'opportunity' as const, relevance: 0.95 },
        { title: 'Learning Strategy', type: 'knowledge' as const, relevance: 0.85 },
      ],
    }
  }

  // Weekly review
  if (lower.includes('week') || lower.includes('review') || lower.includes('semana') || lower.includes('revisão')) {
    return {
      content: `This week's snapshot:\n\n- **${doneTasks.length}** completed\n- **${doingTasks.length}** in progress\n- **${backlogTasks.length}** in backlog\n- Deep work: **${Math.floor(deepWorkMinutes / 60)}h**\n- Streak: **${streakDays} days**\n\nVisit the Weekly Review page for a detailed analysis with insights and reflection prompts.`,
      sources: [
        { title: 'Weekly Summary', type: 'opportunity' as const, relevance: 0.95 },
        { title: 'Progress Analytics', type: 'knowledge' as const, relevance: 0.88 },
      ],
    }
  }

  // Plan my day
  if (lower.includes('plan') || lower.includes('schedule') || lower.includes('agenda') || lower.includes('planejar') || lower.includes('dia')) {
    const morningTasks = highPriority.filter(o => o.type === 'study').slice(0, 2)
    const afternoonTasks = highPriority.filter(o => o.type === 'action').slice(0, 2)
    const morningList = morningTasks.map(t => `- "${t.title}" (SV:${t.strategic_value}, ${calculateXPReward(t.type, t.strategic_value ?? 5)} XP)`).join('\n')
    const afternoonList = afternoonTasks.map(t => `- "${t.title}" (SV:${t.strategic_value}, ${calculateXPReward(t.type, t.strategic_value ?? 5)} XP)`).join('\n')
    return {
      content: `Here's an optimized day plan based on your priorities:\n\n### Morning (High Energy - Deep Work)\n${morningList || '- No study tasks pending'}\n\n### Afternoon (Moderate Energy - Action Items)\n${afternoonList || '- No action tasks pending'}\n\n### Evening\n- Journal reflection (+15 XP)\n- Review tomorrow's priorities\n\nUse the Time Blocking calendar on your Dashboard to schedule these blocks.`,
      sources: [
        { title: 'Daily Planning', type: 'knowledge' as const, relevance: 0.95 },
        { title: 'Energy Optimization', type: 'knowledge' as const, relevance: 0.85 },
      ],
    }
  }

  // Strategy / long-term thinking
  if (lower.includes('strategy') || lower.includes('strategic') || lower.includes('long term') || lower.includes('estrateg') || lower.includes('futuro')) {
    const studyCount = opportunities.filter(o => o.type === 'study').length
    const actionCount = opportunities.filter(o => o.type === 'action').length
    const highSVTasks = opportunities.filter(o => (o.strategic_value ?? 0) >= 8)
    return {
      content: `Strategic overview: You have **${highSVTasks.length} high-impact tasks** (SV >= 8). Study-to-action ratio: **${studyCount}:${actionCount}**.\n\n### Recommendations\n1. ${studyCount > actionCount ? 'Good study focus! Make sure to convert learning into action.' : 'Consider adding more study tasks - they yield the highest XP.'}\n2. Focus on completing high-SV tasks first - they give disproportionate returns.\n3. Your streak (${streakDays} days) is ${streakDays >= 7 ? 'strong! Keep it going.' : 'building. Aim for 7+ days for the Daily Master achievement.'}\n4. Set 2-3 strategic goals with clear milestones on the Goals page.`,
      sources: [
        { title: 'Strategic Analysis', type: 'knowledge' as const, relevance: 0.95 },
        { title: 'XP Optimization', type: 'knowledge' as const, relevance: 0.9 },
      ],
    }
  }

  // Default
  return {
    content: `I have access to **${opportunities.length} opportunities**, **${dailyLogs.length} journal entries**, **${habits.length} habits**, and **${goals.length} goals**. I can help with:\n\n- **Prioritization**: "What should I focus on today?"\n- **Energy management**: "I feel tired, what now?"\n- **Domain balance**: "Am I balanced across domains?"\n- **Goals & habits**: "How are my goals going?"\n- **Study strategy**: "Help me optimize my study plan"\n- **XP & progress**: "How can I level up faster?"\n- **Weekly review**: "How was my week?"\n- **Day planning**: "Plan my day"\n- **Strategy**: "What's my long-term strategy?"\n\nWhat would you like to explore?` + ctxPrefix,
    sources: [
      { title: 'System Overview', type: 'knowledge' as const, relevance: 0.7 },
      ...(priorityContext ? [{ title: 'Priority Context', type: 'knowledge' as const, relevance: 0.85 }] : []),
    ],
  }
}

const SUGGESTED_QUESTIONS = [
  'What should I prioritize today?',
  'Plan my day',
  'Am I balanced across domains?',
  'I feel tired, what now?',
  'How are my goals going?',
  'How can I level up faster?',
  "What's my long-term strategy?",
  'How was my week?',
]

function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  return Boolean(url && key && url !== 'undefined' && key !== 'undefined')
}

export function Consultant() {
  const { opportunities, dailyLogs, habits, goals } = useLocalData()
  const { deepWorkMinutes, streakDays } = useXPSystem()
  const { activePriorities } = usePriorities(opportunities, goals)
  const rag = useRagChat()
  const useAI = isSupabaseConfigured()

  const [messages, setMessages] = useState<ChatMessageType[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: useAI
        ? "Hello! I'm your **Strategic Advisor** powered by AI. I use semantic search across your opportunities, journal entries, and knowledge base to provide personalized, context-aware advice. Ask me anything!"
        : "Hello! I'm your **Strategic Advisor**. I analyze your opportunities, focus sessions, habits, goals, and journal to provide data-driven recommendations. Ask me anything about your productivity, priorities, or progress!",
      timestamp: new Date(),
    },
  ])
  const [isTyping, setIsTyping] = useState(false)
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping, rag.streamingContent])

  async function handleSend(content: string) {
    const userMessage: ChatMessageType = {
      id: `user-${Date.now()}`, role: 'user', content, timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMessage])
    setIsTyping(true)
    setLastFailedMessage(null)

    if (useAI) {
      const result = await rag.sendMessage(content)

      if (result) {
        const assistantMessage: ChatMessageType = {
          id: `assistant-${Date.now()}`, role: 'assistant',
          content: result.content, timestamp: new Date(),
          sources: result.sources as ContextSource[],
        }
        setMessages(prev => [...prev, assistantMessage])
      } else if (rag.error) {
        // Fallback to local if RAG fails
        setLastFailedMessage(content)
        await new Promise(resolve => setTimeout(resolve, 500))
        const ragContext = buildCombinedRAGContext(activePriorities, goals || [], content)
        const response = generateContextualResponse(
          content, opportunities || [], deepWorkMinutes, streakDays,
          dailyLogs || [], habits || [], goals || [], ragContext,
        )
        const assistantMessage: ChatMessageType = {
          id: `assistant-${Date.now()}`, role: 'assistant',
          content: `*(Offline mode)* ${response.content}`, timestamp: new Date(),
          sources: response.sources as ContextSource[],
        }
        setMessages(prev => [...prev, assistantMessage])
      }
    } else {
      // Local fallback mode
      await new Promise(resolve => setTimeout(resolve, 1200 + Math.random() * 800))

      const ragContext = buildCombinedRAGContext(activePriorities, goals || [], content)
      const response = generateContextualResponse(
        content, opportunities || [], deepWorkMinutes, streakDays,
        dailyLogs || [], habits || [], goals || [], ragContext,
      )
      const assistantMessage: ChatMessageType = {
        id: `assistant-${Date.now()}`, role: 'assistant',
        content: response.content, timestamp: new Date(),
        sources: response.sources as ContextSource[],
      }
      setMessages(prev => [...prev, assistantMessage])
    }

    setIsTyping(false)
  }

  function handleRetry() {
    if (lastFailedMessage) {
      // Remove the last offline-mode message and retry
      setMessages(prev => prev.slice(0, -1))
      handleSend(lastFailedMessage)
    }
  }

  function handleNewSession() {
    rag.resetSession()
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: useAI
          ? "New session started. I'm your **Strategic Advisor** powered by AI. How can I help you today?"
          : "New session started. I'm your **Strategic Advisor**. What would you like to explore?",
        timestamp: new Date(),
      },
    ])
    setLastFailedMessage(null)
  }

  const isBusy = isTyping || rag.isStreaming

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col p-4 md:h-screen md:p-6 lg:p-8">
      <header className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Brain className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight">Strategic Advisor</h1>
          <p className="text-sm text-muted-foreground">AI-powered insights from your second brain</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNewSession}
            disabled={isBusy}
            title="New conversation"
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">New conversation</span>
          </Button>
          <Badge variant="outline" className="gap-1.5 text-xs">
            {useAI ? (
              <>
                <Wifi className="h-3 w-3 text-green-500" />
                RAG AI
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 text-muted-foreground" />
                Local
              </>
            )}
          </Badge>
        </div>
      </header>

      <ScrollArea className="flex-1 pr-4">
        <div className="space-y-6 pb-4">
          {messages.map(message => <ChatMessage key={message.id} message={message} />)}

          {/* Streaming content preview */}
          {rag.isStreaming && rag.streamingContent && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="flex max-w-[80%] flex-col gap-2">
                <div className="rounded-xl bg-card px-4 py-3 text-card-foreground">
                  <MarkdownContent content={rag.streamingContent} className="text-sm" />
                  <span className="animate-pulse text-primary">|</span>
                </div>
                {rag.sources.length > 0 && (
                  <SourcesUsed sources={rag.sources} />
                )}
              </div>
            </div>
          )}

          {/* Typing indicator (non-streaming) */}
          {isBusy && !rag.streamingContent && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
                <Sparkles className="h-4 w-4 animate-pulse text-secondary-foreground" />
              </div>
              <div className="space-y-2 pt-2">
                <Skeleton className="h-4 w-48" /><Skeleton className="h-4 w-32" />
              </div>
            </div>
          )}

          {/* Error display with retry */}
          {rag.error && lastFailedMessage && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="flex-1">AI connection failed: {rag.error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                disabled={isBusy}
                className="gap-1.5"
              >
                <RotateCcw className="h-3 w-3" />
                Retry
              </Button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="mt-4 border-t border-border pt-4">
        <div className="mb-2 flex flex-wrap gap-2">
          {SUGGESTED_QUESTIONS.map(q => (
            <button key={q} onClick={() => handleSend(q)} disabled={isBusy}
              className="rounded-full border border-border/50 bg-card/50 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50">
              {q}
            </button>
          ))}
        </div>
        <ChatInput onSend={handleSend} disabled={isBusy} />
      </div>
    </div>
  )
}
