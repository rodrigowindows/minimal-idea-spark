import { useState, useRef, useEffect } from 'react'
import type { ChatMessage as ChatMessageType, ContextSource } from '@/types'
import { ChatMessage } from '@/components/consultant/ChatMessage'
import { ChatInput } from '@/components/consultant/ChatInput'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { MessageSquare, Sparkles } from 'lucide-react'

const MOCK_RESPONSES = [
  {
    content:
      "Based on your current priorities and goals, I'd recommend focusing on your portfolio presentation first. It has the highest strategic value and aligns well with your career objectives. Would you like me to help break it down into smaller tasks?",
    sources: [
      { title: 'Career Goals', type: 'opportunity' as const, relevance: 0.95 },
      { title: 'Weekly Review', type: 'journal' as const, relevance: 0.8 },
    ],
  },
  {
    content:
      "Looking at your energy patterns from the past week, you tend to be most productive in the morning hours. I'd suggest scheduling your deep work sessions before noon and leaving administrative tasks for the afternoon.",
    sources: [
      { title: 'Energy Logs', type: 'journal' as const, relevance: 0.9 },
      { title: 'Sleep Research', type: 'knowledge' as const, relevance: 0.75 },
    ],
  },
  {
    content:
      "Your Health domain has been getting less attention lately. Your morning workout routine has high strategic value but hasn't moved from 'doing' in a while. Consider setting a specific trigger or accountability partner to help maintain consistency.",
    sources: [
      { title: 'Health Goals', type: 'opportunity' as const, relevance: 0.88 },
      { title: 'Habit Research', type: 'knowledge' as const, relevance: 0.82 },
    ],
  },
]

export function Consultant() {
  const [messages, setMessages] = useState<ChatMessageType[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Hello! I'm your Strategic Consultant. I have access to your opportunities, journal entries, and knowledge base. How can I help you make better decisions today?",
      timestamp: new Date(),
    },
  ])
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const responseIndexRef = useRef(0)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  async function handleSend(content: string) {
    const userMessage: ChatMessageType = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setIsTyping(true)

    // Simulate AI thinking
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const mockResponse = MOCK_RESPONSES[responseIndexRef.current % MOCK_RESPONSES.length]
    responseIndexRef.current++

    const assistantMessage: ChatMessageType = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: mockResponse.content,
      timestamp: new Date(),
      sources: mockResponse.sources as ContextSource[],
    }

    setMessages((prev) => [...prev, assistantMessage])
    setIsTyping(false)
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col p-4 md:h-screen md:p-6 lg:p-8">
      {/* Header */}
      <header className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            Strategic Consultant
          </h1>
          <p className="text-sm text-muted-foreground">
            AI-powered insights from your second brain
          </p>
        </div>
      </header>

      {/* Chat messages */}
      <ScrollArea className="flex-1 pr-4">
        <div className="space-y-6 pb-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                Start a conversation with your AI consultant
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))
          )}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
                <Sparkles className="h-4 w-4 text-secondary-foreground" />
              </div>
              <div className="space-y-2 pt-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="mt-4 border-t border-border pt-4">
        <ChatInput onSend={handleSend} disabled={isTyping} />
      </div>
    </div>
  )
}
