import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { ChatMessage as ChatMessageType, ContextSource } from '@/types'
import { ChatMessage } from '@/components/consultant/ChatMessage'
import { ChatInput } from '@/components/consultant/ChatInput'
import { SourcesUsed } from '@/components/consultant/SourcesUsed'
import { MarkdownContent } from '@/components/consultant/MarkdownContent'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Sparkles, Brain, RotateCcw, Trash2, AlertCircle } from 'lucide-react'
import { ContextualTip } from '@/components/Onboarding/ContextualTip'
import { AIFeatureInfo } from '@/components/AIFeatureInfo'
import { useRagChat } from '@/hooks/useRagChat'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layout/PageHeader'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

export function Consultant() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const rag = useRagChat()
  const knownIdsRef = useRef(new Set<string>())

  // Realtime: listen for new messages from other devices
  useEffect(() => {
    if (!user?.id || !rag.sessionId) return

    const channel = supabase
      .channel(`chat-${rag.sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_history',
          filter: `session_id=eq.${rag.sessionId}`,
        },
        (payload) => {
          const row = payload.new as any
          // Skip if we already have this message locally (sent by this device)
          if (knownIdsRef.current.has(row.id)) return
          if (row.user_id !== user.id) return

          const newMsg: ChatMessageType = {
            id: row.id,
            role: row.role as 'user' | 'assistant',
            content: row.content,
            timestamp: new Date(row.created_at),
            sources: row.sources ? (row.sources as ContextSource[]) : undefined,
          }
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m.id === row.id)) return prev
            return [...prev, newMsg]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, rag.sessionId])

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
      content: t('consultant.welcomeAI'),
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

    const result = await rag.sendMessage(content)

    if (result) {
      const assistantMessage: ChatMessageType = {
        id: `assistant-${Date.now()}`, role: 'assistant',
        content: result.content, timestamp: new Date(),
        sources: result.sources as ContextSource[],
      }
      setMessages(prev => [...prev, assistantMessage])
    } else if (rag.error) {
      setLastFailedMessage(content)
    }

    setIsTyping(false)
  }

  function handleRetry() {
    if (lastFailedMessage) {
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
        content: t('consultant.newSessionAI'),
        timestamp: new Date(),
      },
    ])
    setLastFailedMessage(null)
  }

  const isBusy = isTyping || rag.isStreaming

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col p-4 md:h-screen md:p-6 lg:p-8">
      <PageHeader
        icon={<Brain className="h-6 w-6 text-primary" />}
        title={t('consultant.title')}
        description={t('consultant.subtitle')}
        variant="compact"
        actions={
          <div className="flex items-center gap-2">
            <AIFeatureInfo feature="rag" />
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
              <Sparkles className="h-3 w-3 text-primary" />
              AI RAG
            </Badge>
          </div>
        }
      />

      <ContextualTip
        tipId="rag-consultant"
        titleKey="onboarding.contextualTips.ragTitle"
        descriptionKey="onboarding.contextualTips.ragDesc"
        className="mb-4"
      />

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

          {/* Typing indicator */}
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
