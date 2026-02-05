import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Sparkles, Send, Zap, Target, Brain, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useXPSystem } from '@/hooks/useXPSystem'
import { GAMIFICATION_CONFIG } from '@/lib/constants'

const QUICK_ACTIONS = [
  { label: 'Quick Log', icon: Zap, type: 'log' as const },
  { label: 'Set Goal', icon: Target, type: 'goal' as const },
  { label: 'Brain Dump', icon: Brain, type: 'dump' as const },
  { label: 'Review Week', icon: MessageSquare, type: 'review' as const },
] as const

export function SmartCapture() {
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastXPAwarded, setLastXPAwarded] = useState<number | null>(null)
  const { awardCapture, awardInsight } = useXPSystem()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isProcessing) return

    setIsProcessing(true)
    setLastXPAwarded(null)

    // Simulate AI processing delay
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Determine XP award based on content
    const lowerInput = input.toLowerCase()
    let xpAward = GAMIFICATION_CONFIG.XP_RULES.capture
    let toastMessage = 'Captured and saved to your daily log!'
    let detectedType = 'log'

    // Detect insights
    if (lowerInput.includes('insight') || lowerInput.includes('realized') || lowerInput.includes('learned')) {
      awardInsight()
      xpAward = GAMIFICATION_CONFIG.XP_RULES.insight_added
      toastMessage = 'Insight captured!'
      detectedType = 'insight'
    }
    // Detect networking
    else if (lowerInput.includes('met') || lowerInput.includes('connected') || lowerInput.includes('network')) {
      xpAward = GAMIFICATION_CONFIG.XP_RULES.networking
      toastMessage = 'Networking activity logged!'
      detectedType = 'networking'
    }
    // Default capture
    else {
      awardCapture()
    }

    setLastXPAwarded(xpAward)

    // Show toast with XP reward
    toast.success(
      <div className="flex items-center gap-2">
        <span>{toastMessage}</span>
        <Badge variant="secondary" className="gap-1 bg-amber-500/20 text-amber-400">
          <Zap className="h-3 w-3" />
          +{xpAward} XP
        </Badge>
      </div>
    )

    setInput('')
    setIsProcessing(false)

    // Clear XP indicator after animation
    setTimeout(() => setLastXPAwarded(null), 2000)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  function handleQuickAction(type: string) {
    switch (type) {
      case 'log':
        setInput('')
        break
      case 'goal':
        setInput('My goal for today: ')
        break
      case 'dump':
        setInput('Brain dump: ')
        break
      case 'review':
        setInput('Weekly review: ')
        break
    }
  }

  return (
    <div className="relative space-y-3">
      <form onSubmit={handleSubmit} className="relative">
        <div
          className={cn(
            'relative flex items-center rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm transition-all',
            'focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20',
            isProcessing && 'opacity-50'
          )}
        >
          <Sparkles className="ml-4 h-5 w-5 shrink-0 text-primary" />
          <Input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Capture a thought, task, or insight..."
            disabled={isProcessing}
            className="flex-1 border-0 bg-transparent text-base placeholder:text-muted-foreground/60 focus-visible:ring-0"
          />
          {lastXPAwarded && (
            <span className="mr-2 animate-pulse text-sm font-semibold text-amber-400">
              +{lastXPAwarded} XP
            </span>
          )}
          <Button
            type="submit"
            size="sm"
            disabled={!input.trim() || isProcessing}
            className="mr-2 gap-1.5"
          >
            <Send className="h-4 w-4" />
            <span className="sr-only md:not-sr-only">Capture</span>
          </Button>
        </div>
      </form>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.type}
            onClick={() => handleQuickAction(action.type)}
            disabled={isProcessing}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card/50 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors',
              'hover:border-primary/50 hover:bg-primary/10 hover:text-primary',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            <action.icon className="h-3.5 w-3.5" />
            {action.label}
          </button>
        ))}
      </div>

      {/* Processing overlay */}
      {isProcessing && (
        <div className="absolute inset-x-0 top-full z-10 mt-2 rounded-xl border border-border/50 bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="relative h-5 w-5">
              <Sparkles className="h-5 w-5 animate-pulse text-primary" />
            </div>
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Processing your input with AI...
          </p>
        </div>
      )}
    </div>
  )
}
