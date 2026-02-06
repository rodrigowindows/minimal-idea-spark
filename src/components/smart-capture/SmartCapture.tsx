import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Sparkles, Send, Zap, Target, Brain, MessageSquare, BookOpen, Users, Lightbulb } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useXPSystem } from '@/hooks/useXPSystem'
import { calculateXPReward } from '@/lib/constants'
import { VoiceInput } from './VoiceInput'

const QUICK_ACTIONS = [
  { label: 'Quick Log', icon: Zap, type: 'log' as const },
  { label: 'Set Goal', icon: Target, type: 'goal' as const },
  { label: 'Brain Dump', icon: Brain, type: 'dump' as const },
  { label: 'Review Week', icon: MessageSquare, type: 'review' as const },
] as const

const TYPE_ICON_MAP = {
  study: BookOpen,
  action: Zap,
  networking: Users,
  insight: Lightbulb,
}

interface ClassificationResult {
  domain: string
  type: 'study' | 'action' | 'insight' | 'networking'
  strategicValue: number
  xpReward: number
}

function mockClassify(input: string): ClassificationResult {
  const lower = input.toLowerCase()
  let type: ClassificationResult['type'] = 'action'
  let domain = 'Career'
  let strategicValue = 5

  // Study / Learning patterns
  if (lower.includes('study') || lower.includes('learn') || lower.includes('course') || lower.includes('aula') || lower.includes('revisar') || lower.includes('concurso') || lower.includes('exam') || lower.includes('prova') || lower.includes('read') || lower.includes('book') || lower.includes('tutorial') || lower.includes('lecture') || lower.includes('estud')) {
    type = 'study'; domain = 'Learning'; strategicValue = 8
    if (lower.includes('concurso') || lower.includes('sefaz') || lower.includes('exam') || lower.includes('prova')) strategicValue = 10
  }
  // Insight patterns
  else if (lower.includes('insight') || lower.includes('realized') || lower.includes('learned') || lower.includes('idea') || lower.includes('thought') || lower.includes('discover') || lower.includes('percebi') || lower.includes('eureka')) {
    type = 'insight'; domain = 'Learning'; strategicValue = 6
  }
  // Networking patterns
  else if (lower.includes('met') || lower.includes('connect') || lower.includes('network') || lower.includes('call') || lower.includes('meeting') || lower.includes('coffee') || lower.includes('mentor') || lower.includes('reunião') || lower.includes('evento')) {
    type = 'networking'; domain = 'Career'; strategicValue = 4
  }
  // Health patterns
  else if (lower.includes('health') || lower.includes('workout') || lower.includes('exercise') || lower.includes('medico') || lower.includes('gym') || lower.includes('run') || lower.includes('yoga') || lower.includes('diet') || lower.includes('sleep') || lower.includes('saude') || lower.includes('academia') || lower.includes('treino') || lower.includes('corrida')) {
    type = 'action'; domain = 'Health'; strategicValue = 7
  }
  // Family patterns
  else if (lower.includes('family') || lower.includes('familia') || lower.includes('mom') || lower.includes('dad') || lower.includes('mãe') || lower.includes('pai') || lower.includes('filho') || lower.includes('wife') || lower.includes('esposa') || lower.includes('vô') || lower.includes('avó') || lower.includes('avô') || lower.includes('kid') || lower.includes('son') || lower.includes('daughter')) {
    type = 'action'; domain = 'Family'; strategicValue = 8
  }
  // Finance patterns
  else if (lower.includes('finance') || lower.includes('invest') || lower.includes('money') || lower.includes('budget') || lower.includes('save') || lower.includes('dinheiro') || lower.includes('financ') || lower.includes('bitcoin') || lower.includes('crypto') || lower.includes('stock')) {
    type = 'action'; domain = 'Finance'; strategicValue = 6
  }
  // Career patterns
  else if (lower.includes('portfolio') || lower.includes('resume') || lower.includes('project') || lower.includes('work') || lower.includes('client') || lower.includes('deploy') || lower.includes('code') || lower.includes('feature')) {
    type = 'action'; domain = 'Career'; strategicValue = 7
  }

  return { domain, type, strategicValue, xpReward: calculateXPReward(type, strategicValue) }
}

interface SmartCaptureProps {
  onCapture?: (data: { title: string; type: string; domain: string; strategicValue: number }) => void
}

export function SmartCapture({ onCapture }: SmartCaptureProps = {}) {
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [classification, setClassification] = useState<ClassificationResult | null>(null)
  const [showXP, setShowXP] = useState(false)
  const [lastXP, setLastXP] = useState(0)
  const { addXP, awardCapture, awardInsight } = useXPSystem()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isProcessing) return
    setIsProcessing(true)
    setClassification(null)

    await new Promise((resolve) => setTimeout(resolve, 1200))

    const result = mockClassify(input)
    setClassification(result)
    addXP(result.xpReward)
    if (result.type === 'insight') awardInsight()
    else awardCapture()

    // Notify parent to save opportunity
    onCapture?.({
      title: input.trim(),
      type: result.type,
      domain: result.domain,
      strategicValue: result.strategicValue,
    })

    setLastXP(result.xpReward)
    setShowXP(true)

    toast.success(
      <div className="flex items-center gap-2">
        <span>Captured as <span className="capitalize font-medium">{result.type}</span> in {result.domain}</span>
        <Badge variant="secondary" className="gap-1 bg-amber-500/20 text-amber-400">
          <Zap className="h-3 w-3" />+{result.xpReward} XP
        </Badge>
      </div>
    )
    setIsProcessing(false)
    setTimeout(() => { setInput(''); setClassification(null); setShowXP(false) }, 2500)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e) }
  }

  function handleQuickAction(type: string) {
    switch (type) {
      case 'log': setInput(''); break
      case 'goal': setInput('My goal for today: '); break
      case 'dump': setInput('Brain dump: '); break
      case 'review': setInput('Weekly review: '); break
    }
  }

  const TypeIcon = classification ? TYPE_ICON_MAP[classification.type] : null

  return (
    <div className="relative space-y-3">
      <form onSubmit={handleSubmit} className="relative">
        <div className={cn(
          'relative flex items-center rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm transition-all',
          'focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20',
          isProcessing && 'opacity-50'
        )}>
          <Sparkles className="ml-4 h-5 w-5 shrink-0 text-primary" />
          <Input
            type="text" value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Capture anything... AI classifies automatically"
            disabled={isProcessing}
            className="flex-1 border-0 bg-transparent text-base placeholder:text-muted-foreground/60 focus-visible:ring-0"
          />
          <AnimatePresence>
            {showXP && (
              <motion.span
                initial={{ opacity: 0, y: 0 }} animate={{ opacity: 1, y: -20 }}
                exit={{ opacity: 0, y: -40 }}
                className="absolute right-16 top-0 text-sm font-bold text-amber-400"
              >+{lastXP} XP</motion.span>
            )}
          </AnimatePresence>
          <VoiceInput
            onTranscript={(text) => setInput((prev) => prev + text)}
            disabled={isProcessing}
          />
          <Button type="submit" size="sm" disabled={!input.trim() || isProcessing} className="mr-2 gap-1.5 min-h-[44px] min-w-[44px]">
            <Send className="h-4 w-4" />
            <span className="sr-only md:not-sr-only">Capture</span>
          </Button>
        </div>
      </form>

      <div className="flex flex-wrap gap-2">
        {QUICK_ACTIONS.map((action) => (
          <button key={action.type} onClick={() => handleQuickAction(action.type)} disabled={isProcessing}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card/50 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors touch-manipulation min-h-[44px]',
              'hover:border-primary/50 hover:bg-primary/10 hover:text-primary',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}>
            <action.icon className="h-3.5 w-3.5" />{action.label}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {isProcessing && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="absolute inset-x-0 top-full z-10 mt-2 rounded-xl border border-border/50 bg-card p-4">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 animate-pulse text-primary" />
              <div className="flex-1 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Identifying domain, type, and strategic value...</p>
          </motion.div>
        )}
        {classification && !isProcessing && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="rounded-xl border border-primary/30 bg-primary/5 p-3">
            <div className="flex items-center gap-3">
              {TypeIcon && <TypeIcon className="h-5 w-5 text-primary" />}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="capitalize text-xs">{classification.type}</Badge>
                  <Badge variant="outline" className="text-xs">{classification.domain}</Badge>
                  <span className="text-xs text-muted-foreground">SV: {classification.strategicValue}/10</span>
                </div>
              </div>
              <Badge className="gap-1 bg-amber-500/20 text-amber-400 border-0">
                <Zap className="h-3 w-3" />+{classification.xpReward} XP
              </Badge>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
