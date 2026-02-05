import type { ChatMessage as ChatMessageType } from '@/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { User, Sparkles, FileText, BookOpen, Target } from 'lucide-react'

interface ChatMessageProps {
  message: ChatMessageType
}

const sourceIcons = {
  opportunity: Target,
  journal: BookOpen,
  knowledge: FileText,
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div
      className={cn(
        'flex w-full gap-3',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary text-secondary-foreground'
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
      </div>

      {/* Message content */}
      <div
        className={cn(
          'flex max-w-[80%] flex-col gap-2',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        <Card
          className={cn(
            'rounded-xl px-4 py-3',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-card text-card-foreground'
          )}
        >
          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        </Card>

        {/* Context sources (for assistant messages) */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <span className="text-xs text-muted-foreground">Sources:</span>
            {message.sources.map((source, idx) => {
              const Icon = sourceIcons[source.type]
              return (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="gap-1 text-xs"
                >
                  <Icon className="h-3 w-3" />
                  {source.title}
                </Badge>
              )
            })}
          </div>
        )}

        {/* Timestamp */}
        <span className="text-xs text-muted-foreground">
          {message.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  )
}
