import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
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
import type { TFunction } from 'i18next'

function generateContextualResponse(
  t: TFunction,
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

  const ctxPrefix = priorityContext ? t('consultant.responses.priorityContextPrefix', { context: priorityContext }) : ''

  // Priority / Today
  if (lower.includes('priorit') || lower.includes('today') || lower.includes('what should') || lower.includes('foco') || lower.includes('focus')) {
    const top = highPriority[0]
    const topXP = top ? calculateXPReward(top.type, top.strategic_value ?? 5) : 0
    return {
      content: (top
        ? t('consultant.responses.priorityRecommend', { title: top.title, type: top.type, sv: top.strategic_value, xp: topXP, doing: doingTasks.length, backlog: backlogTasks.length })
        : t('consultant.responses.priorityGeneric', { total: opportunities.length })) + ctxPrefix,
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
    const moodSummary = recentMoods.length > 0 ? t('consultant.responses.recentMoods', { moods: recentMoods.join(', ') }) : ''
    return {
      content: `${t('consultant.responses.energyDeepWork', { hours: deepHours })} ${deepHours > 8 ? t('consultant.responses.energyIntensive') : t('consultant.responses.energyCapacity')} ${moodSummary} ${t('consultant.responses.streakAt', { days: streakDays })} ${t('consultant.responses.energyTips')}`,
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
    const warning = maxPct > 40 ? t('consultant.responses.domainWarning', { domain: max[0], pct: maxPct }) : ''
    return {
      content: `${t('consultant.responses.domainDistribution', { breakdown })}${warning}${t('consultant.responses.domainCheckRadar')}`,
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
        content: t('consultant.responses.noGoals'),
        sources: [{ title: 'Goal Setting', type: 'knowledge' as const, relevance: 0.9 }],
      }
    }
    const activeGoals = goals.filter((g: any) => g.progress < 100)
    const summary = activeGoals.map((g: any) => `"${g.title}" (${g.progress}%)`).join(', ')
    return {
      content: t('consultant.responses.activeGoals', { count: activeGoals.length, summary }),
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
        content: t('consultant.responses.noHabits'),
        sources: [{ title: 'Habit Formation', type: 'knowledge' as const, relevance: 0.9 }],
      }
    }
    const today = new Date().toISOString().split('T')[0]
    const completedToday = habits.filter((h: any) => h.completions?.includes(today)).length
    return {
      content: `${t('consultant.responses.habitProgress', { total: habits.length, done: completedToday })} ${completedToday === habits.length ? t('consultant.responses.habitPerfect') : t('consultant.responses.habitRemaining')} ${t('consultant.responses.habitXP')}`,
      sources: [
        { title: 'Habit Tracking', type: 'knowledge' as const, relevance: 0.9 },
      ],
    }
  }

  // XP / Level / Progress
  if (lower.includes('xp') || lower.includes('level') || lower.includes('progress') || lower.includes('progresso')) {
    const totalXP = doneTasks.reduce((sum, o) => sum + calculateXPReward(o.type, o.strategic_value ?? 5), 0)
    return {
      content: t('consultant.responses.xpCompleted', { count: doneTasks.length, xp: totalXP, streak: streakDays, dwXp: Math.floor(deepWorkMinutes / 25) * 50 }),
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
        ? t('consultant.responses.studyPending', { count: studyTasks.length, title: topStudy.title, sv: topStudy.strategic_value, xp: calculateXPReward('study', topStudy.strategic_value ?? 5) })
        : t('consultant.responses.noStudy'),
      sources: [
        { title: 'Study Analysis', type: 'opportunity' as const, relevance: 0.95 },
        { title: 'Learning Strategy', type: 'knowledge' as const, relevance: 0.85 },
      ],
    }
  }

  // Weekly review
  if (lower.includes('week') || lower.includes('review') || lower.includes('semana') || lower.includes('revisão')) {
    return {
      content: t('consultant.responses.weekSnapshot', { done: doneTasks.length, doing: doingTasks.length, backlog: backlogTasks.length, hours: Math.floor(deepWorkMinutes / 60), streak: streakDays }),
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
    const morningList = morningTasks.map(tsk => `- "${tsk.title}" (SV:${tsk.strategic_value}, ${calculateXPReward(tsk.type, tsk.strategic_value ?? 5)} XP)`).join('\n')
    const afternoonList = afternoonTasks.map(tsk => `- "${tsk.title}" (SV:${tsk.strategic_value}, ${calculateXPReward(tsk.type, tsk.strategic_value ?? 5)} XP)`).join('\n')
    return {
      content: `${t('consultant.responses.dayPlanTitle')}\n\n${t('consultant.responses.dayPlanMorning')}\n${morningList || t('consultant.responses.noStudyTasks')}\n\n${t('consultant.responses.dayPlanAfternoon')}\n${afternoonList || t('consultant.responses.noActionTasks')}\n\n${t('consultant.responses.dayPlanEvening')}`,
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
      content: `${t('consultant.responses.strategyOverview', { highSV: highSVTasks.length, study: studyCount, action: actionCount })}\n\n### Recommendations\n1. ${studyCount > actionCount ? t('consultant.responses.strategyGoodStudy') : t('consultant.responses.strategyNeedStudy')}\n2. ${t('consultant.responses.strategyHighSV')}\n3. ${t('consultant.responses.streakAt', { days: streakDays })} ${streakDays >= 7 ? t('consultant.responses.strategyStreakStrong') : t('consultant.responses.strategyStreakBuilding')}\n4. ${t('consultant.responses.strategySetGoals')}`,
      sources: [
        { title: 'Strategic Analysis', type: 'knowledge' as const, relevance: 0.95 },
        { title: 'XP Optimization', type: 'knowledge' as const, relevance: 0.9 },
      ],
    }
  }

  // Default
  return {
    content: `${t('consultant.responses.defaultIntro', { opportunities: opportunities.length, logs: dailyLogs.length, habits: habits.length, goals: goals.length })}\n\n- ${t('consultant.responses.defaultPrioritization')}\n- ${t('consultant.responses.defaultEnergy')}\n- ${t('consultant.responses.defaultDomain')}\n- ${t('consultant.responses.defaultGoals')}\n- ${t('consultant.responses.defaultStudy')}\n- ${t('consultant.responses.defaultXP')}\n- ${t('consultant.responses.defaultWeekly')}\n- ${t('consultant.responses.defaultPlanning')}\n- ${t('consultant.responses.defaultStrategy')}\n\n${t('consultant.responses.defaultAsk')}` + ctxPrefix,
    sources: [
      { title: 'System Overview', type: 'knowledge' as const, relevance: 0.7 },
      ...(priorityContext ? [{ title: 'Priority Context', type: 'knowledge' as const, relevance: 0.85 }] : []),
    ],
  }
}

function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  return Boolean(url && key && url !== 'undefined' && key !== 'undefined')
}

export function Consultant() {
  const { t } = useTranslation()
  const { opportunities, dailyLogs, habits, goals } = useLocalData()
  const { deepWorkMinutes, streakDays } = useXPSystem()
  const { activePriorities } = usePriorities(opportunities, goals)
  const rag = useRagChat()
  const useAI = isSupabaseConfigured()

  const SUGGESTED_QUESTIONS = [
    t('consultant.suggestedQuestions.prioritize'),
    t('consultant.suggestedQuestions.planDay'),
    t('consultant.suggestedQuestions.balanced'),
    t('consultant.suggestedQuestions.tired'),
    t('consultant.suggestedQuestions.goalsProgress'),
    t('consultant.suggestedQuestions.levelUp'),
    t('consultant.suggestedQuestions.strategy'),
    t('consultant.suggestedQuestions.weekReview'),
  ]

  const [messages, setMessages] = useState<ChatMessageType[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: useAI ? t('consultant.welcomeAI') : t('consultant.welcomeLocal'),
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
          t, content, opportunities || [], deepWorkMinutes, streakDays,
          dailyLogs || [], habits || [], goals || [], ragContext,
        )
        const assistantMessage: ChatMessageType = {
          id: `assistant-${Date.now()}`, role: 'assistant',
          content: `*${t('consultant.offlineMode')}* ${response.content}`, timestamp: new Date(),
          sources: response.sources as ContextSource[],
        }
        setMessages(prev => [...prev, assistantMessage])
      }
    } else {
      // Local fallback mode
      await new Promise(resolve => setTimeout(resolve, 1200 + Math.random() * 800))

      const ragContext = buildCombinedRAGContext(activePriorities, goals || [], content)
      const response = generateContextualResponse(
        t, content, opportunities || [], deepWorkMinutes, streakDays,
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
        content: useAI ? t('consultant.newSessionAI') : t('consultant.newSessionLocal'),
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
          <h1 className="text-xl font-bold tracking-tight">{t('consultant.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('consultant.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNewSession}
            disabled={isBusy}
            title={t('consultant.newConversation')}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">{t('consultant.newConversation')}</span>
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
              <span className="flex-1">{t('consultant.aiFailed')}: {rag.error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                disabled={isBusy}
                className="gap-1.5"
              >
                <RotateCcw className="h-3 w-3" />
                {t('consultant.retry')}
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
