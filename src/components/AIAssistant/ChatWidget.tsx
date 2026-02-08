import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  MessageSquare,
  Send,
  X,
  Minimize2,
  Lightbulb,
  Plus,
  Trash2,
  MessagesSquare,
  ChevronLeft,
  Zap,
  BookOpen,
  Target,
  BarChart3,
  Compass,
  Search,
  Repeat,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAssistant, type AssistantPersona } from '@/hooks/useAssistant'
import { useAppContext } from '@/contexts/AppContext'

const COMMAND_ICONS: Record<string, React.ReactNode> = {
  'plus': <Plus className="h-3 w-3" />,
  'book': <BookOpen className="h-3 w-3" />,
  'target': <Target className="h-3 w-3" />,
  'bar-chart': <BarChart3 className="h-3 w-3" />,
  'compass': <Compass className="h-3 w-3" />,
  'search': <Search className="h-3 w-3" />,
  'repeat': <Repeat className="h-3 w-3" />,
}

type View = 'chat' | 'threads'

export function ChatWidget() {
  const {
    messages,
    send,
    open,
    setOpen,
    loading,
    persona,
    setPersona,
    personaConfig,
    threads,
    activeThreadId,
    newThread,
    switchThread,
    deleteThread,
    clearHistory,
    suggestions,
    quickCommands,
  } = useAssistant()

  const { deepWorkMode } = useAppContext()
  const [input, setInput] = useState('')
  const [view, setView] = useState<View>('chat')
  const [showSuggestions, setShowSuggestions] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (open && view === 'chat') {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open, view])

  // Hide in deep work mode
  if (deepWorkMode) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return
    send(input.trim())
    setInput('')
    setShowSuggestions(false)
  }

  const handleQuickCommand = (label: string) => {
    setInput(label + ' ')
    inputRef.current?.focus()
  }

  const handleSuggestionClick = (suggestion: string) => {
    send(suggestion)
    setShowSuggestions(false)
  }

  const formatMessage = (content: string) => {
    // Simple markdown-like formatting
    return content
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br />')
      .replace(/^- /gm, '&bull; ')
  }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <Button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg md:bottom-8 md:right-8 animate-in fade-in slide-in-from-bottom-4"
          size="icon"
        >
          <MessageSquare className="h-6 w-6" />
          {suggestions.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
              {suggestions.length}
            </span>
          )}
        </Button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className={cn(
            'fixed bottom-6 right-6 z-50 flex flex-col overflow-hidden rounded-xl border bg-card shadow-2xl md:bottom-8 md:right-8',
            'w-[380px] max-h-[560px]',
            'animate-in fade-in slide-in-from-bottom-4 duration-200'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b bg-card px-3 py-2">
            <div className="flex items-center gap-2">
              {view === 'threads' ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setView('chat')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setView('threads')}
                  title="Conversation history"
                >
                  <MessagesSquare className="h-4 w-4" />
                </Button>
              )}
              {view === 'chat' ? (
                <Select
                  value={persona}
                  onValueChange={(v) => setPersona(v as AssistantPersona)}
                >
                  <SelectTrigger className="h-7 w-[120px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(personaConfig) as AssistantPersona[]).map((p) => (
                      <SelectItem key={p} value={p}>
                        {personaConfig[p].name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-sm font-semibold">Conversations</span>
              )}
            </div>
            <div className="flex gap-0.5">
              {view === 'chat' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => newThread()}
                  title="New conversation"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setOpen(false)}
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Threads view */}
          {view === 'threads' && (
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {threads.length === 0 && (
                  <p className="text-center text-xs text-muted-foreground py-8">
                    No conversations yet
                  </p>
                )}
                {threads.map((t) => (
                  <div
                    key={t.id}
                    className={cn(
                      'group flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors',
                      t.id === activeThreadId
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted'
                    )}
                    onClick={() => {
                      switchThread(t.id)
                      setView('chat')
                    }}
                  >
                    <MessageSquare className="h-4 w-4 shrink-0 opacity-50" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-xs font-medium">{t.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {t.persona} &middot; {t.messages.length} msg
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteThread(t.id)
                      }}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
                {threads.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2 text-xs text-muted-foreground"
                    onClick={clearHistory}
                  >
                    Clear all conversations
                  </Button>
                )}
              </div>
            </ScrollArea>
          )}

          {/* Chat view */}
          {view === 'chat' && (
            <>
              {/* Proactive suggestions */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="border-b bg-amber-500/5 px-3 py-2 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                    <Lightbulb className="h-3 w-3" />
                    Suggestions
                  </div>
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      className="block w-full text-left text-xs text-muted-foreground hover:text-foreground transition-colors rounded px-1.5 py-1 hover:bg-muted/50"
                      onClick={() => handleSuggestionClick(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {/* Messages */}
              <ScrollArea className="flex-1 min-h-0" style={{ maxHeight: '320px' }}>
                <div className="space-y-2 p-3">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        'rounded-lg px-3 py-2 text-xs leading-relaxed',
                        m.role === 'user'
                          ? 'ml-10 bg-primary text-primary-foreground'
                          : 'mr-6 bg-muted',
                        m.action && 'border-l-2 border-green-500'
                      )}
                    >
                      {m.action && (
                        <div className="flex items-center gap-1 mb-1 text-[10px] font-medium text-green-600 dark:text-green-400">
                          <Zap className="h-3 w-3" />
                          Action executed
                        </div>
                      )}
                      <div
                        dangerouslySetInnerHTML={{
                          __html: formatMessage(m.content),
                        }}
                      />
                    </div>
                  ))}
                  {loading && (
                    <div className="mr-6 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                      <span className="inline-flex gap-1">
                        <span className="animate-bounce" style={{ animationDelay: '0ms' }}>&bull;</span>
                        <span className="animate-bounce" style={{ animationDelay: '150ms' }}>&bull;</span>
                        <span className="animate-bounce" style={{ animationDelay: '300ms' }}>&bull;</span>
                      </span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Quick commands */}
              <div className="flex flex-wrap gap-1 border-t px-2 pt-2">
                {quickCommands.map((cmd) => (
                  <Button
                    key={cmd.label}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] gap-1 px-2"
                    onClick={() => handleQuickCommand(cmd.label)}
                  >
                    {COMMAND_ICONS[cmd.icon]}
                    {cmd.label}
                  </Button>
                ))}
              </div>

              {/* Input */}
              <form onSubmit={handleSubmit} className="flex gap-2 border-t p-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a command or ask anything..."
                  disabled={loading}
                  className="flex-1 h-9 text-xs"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="h-9 w-9"
                  disabled={!input.trim() || loading}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  )
}
