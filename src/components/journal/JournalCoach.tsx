import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sparkles, Send, Loader2 } from 'lucide-react'
import { useAIJournalCoach } from '@/hooks/useAIFeatures'
import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'

interface JournalCoachProps {
  recentEntries?: Array<{ date: string; mood?: string; energy?: number; content: string }>
  currentMood?: string
  currentEnergy?: number
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export function JournalCoach({ recentEntries, currentMood, currentEnergy }: JournalCoachProps) {
  const { getCoachResponse, loading } = useAIJournalCoach()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [started, setStarted] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const startCoaching = async () => {
    setStarted(true)
    const initialMsg: Message = {
      role: 'user',
      content: currentMood
        ? `I'm starting my journal today. My mood is ${currentMood} and energy level is ${currentEnergy ?? 5}/10.`
        : "I'm starting my journal today. Help me reflect.",
    }
    setMessages([initialMsg])

    const reply = await getCoachResponse([initialMsg], recentEntries)
    if (reply) {
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMsg: Message = { role: 'user', content: input.trim() }
    const allMessages = [...messages, userMsg]
    setMessages(allMessages)
    setInput('')

    const reply = await getCoachResponse(allMessages, recentEntries)
    if (reply) {
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    }
  }

  if (!started) {
    return (
      <Card className="border-accent/20">
        <CardContent className="pt-6 text-center">
          <Sparkles className="h-8 w-8 text-accent mx-auto mb-3" />
          <h3 className="font-semibold mb-1">AI Journal Coach</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Get guided reflective questions based on your mood and energy.
          </p>
          <Button onClick={startCoaching} variant="outline" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Start Coaching Session
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-accent/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 text-accent" />
          Journal Coach
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ScrollArea className="h-48">
          <div className="space-y-2 pr-2">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  'rounded-lg px-3 py-2 text-xs',
                  m.role === 'user'
                    ? 'ml-8 bg-primary text-primary-foreground'
                    : 'mr-4 bg-muted'
                )}
              >
                {m.role === 'assistant' ? (
                  <div className="prose prose-xs dark:prose-invert max-w-none">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  m.content
                )}
              </div>
            ))}
            {loading && (
              <div className="mr-4 rounded-lg bg-muted px-3 py-2 text-xs flex items-center gap-1.5 text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Thinking...
              </div>
            )}
            <div ref={endRef} />
          </div>
        </ScrollArea>

        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Share your thoughts..."
            className="min-h-[60px] text-xs resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
            }}
          />
          <Button
            size="icon"
            className="shrink-0 h-[60px]"
            onClick={sendMessage}
            disabled={!input.trim() || loading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
