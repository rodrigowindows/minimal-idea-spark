import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MessageSquare, Send, X, Minimize2, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAssistant, type AssistantPersona } from '@/hooks/useAssistant'

export function ChatWidget() {
  const { messages, send, open, setOpen, loading, persona, setPersona, proactiveSuggestion, quickCommands } = useAssistant()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return
    send(input.trim())
    setInput('')
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg md:bottom-8 md:right-8"
        size="icon"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>

      {open && (
        <div
          className={cn(
            'fixed bottom-24 right-6 z-50 flex w-[360px] flex-col overflow-hidden rounded-xl border bg-card shadow-xl md:bottom-28 md:right-8',
            'max-h-[480px]'
          )}
        >
          <div className="flex items-center justify-between border-b px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold">AI Assistant</span>
              <Select value={persona} onValueChange={(v) => setPersona(v as AssistantPersona)}>
                <SelectTrigger className="h-8 w-[110px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="assistant">Assistant</SelectItem>
                  <SelectItem value="coach">Coach</SelectItem>
                  <SelectItem value="planner">Planner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}><Minimize2 className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}><X className="h-4 w-4" /></Button>
            </div>
          </div>
          {proactiveSuggestion && (
            <div className="flex items-start gap-2 border-b bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <Lightbulb className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{proactiveSuggestion}</span>
            </div>
          )}
          <ScrollArea className="flex-1 p-3">
            <div className="space-y-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    'rounded-lg px-3 py-2 text-sm',
                    m.role === 'user' ? 'ml-8 bg-primary text-primary-foreground' : 'mr-8 bg-muted'
                  )}
                >
                  {m.content}
                </div>
              ))}
              {loading && (
                <div className="mr-8 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">Thinking...</div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          <div className="flex flex-wrap gap-1 border-t px-2 pt-2">
            {quickCommands.map((cmd) => (
              <Button key={cmd.label} type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setInput(cmd.label + ' ')}>
                {cmd.label}
              </Button>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="flex gap-2 border-t p-2">
            <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Create task, log journal, open page..." disabled={loading} className="flex-1" />
            <Button type="submit" size="icon" disabled={!input.trim() || loading}><Send className="h-4 w-4" /></Button>
          </form>
        </div>
      )}
    </>
  )
}
