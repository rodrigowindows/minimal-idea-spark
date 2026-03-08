import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles, Loader2, RefreshCw, TrendingUp, Target, Brain, Flame, Zap } from 'lucide-react'
import { useAIWeeklyInsights } from '@/hooks/useAIFeatures'
import ReactMarkdown from 'react-markdown'
import { motion, AnimatePresence } from 'framer-motion'

interface AIWeeklyInsightsProps {
  metrics: {
    tasks_completed: number
    tasks_doing: number
    deep_work_minutes: number
    streak_days: number
    xp_gained: number
    avg_mood?: string
    avg_energy?: string
    habits_rate?: number
    goals_count?: number
    goals_progress?: number
    domains?: string[]
  }
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
      />
    </div>
  )
}

function PulsingOrb() {
  return (
    <div className="relative mx-auto my-6 flex items-center justify-center">
      <motion.div
        className="absolute h-16 w-16 rounded-full bg-primary/10"
        animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0.1, 0.4] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute h-10 w-10 rounded-full bg-primary/20"
        animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0.2, 0.6] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
      />
      <Loader2 className="h-6 w-6 animate-spin text-primary relative z-10" />
    </div>
  )
}

export function AIWeeklyInsights({ metrics }: AIWeeklyInsightsProps) {
  const { generateInsights, insights, loading } = useAIWeeklyInsights()
  const [generated, setGenerated] = useState(false)

  const handleGenerate = async () => {
    await generateInsights(metrics)
    setGenerated(true)
  }

  const statCards = useMemo(() => [
    { icon: Target, label: 'Done', value: metrics.tasks_completed, max: 5, color: 'hsl(var(--chart-2))' },
    { icon: Brain, label: 'Focus', value: Math.floor(metrics.deep_work_minutes / 60), max: 10, color: 'hsl(var(--chart-4))' },
    { icon: Flame, label: 'Streak', value: metrics.streak_days, max: 7, color: 'hsl(var(--chart-3))' },
    { icon: Zap, label: 'XP', value: metrics.xp_gained, max: 700, color: 'hsl(var(--chart-1))' },
  ], [metrics])

  return (
    <Card className="relative overflow-hidden rounded-xl border-primary/20 bg-gradient-to-br from-card via-card to-primary/[0.03]">
      {/* Decorative corner glow */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />

      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <motion.div
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Sparkles className="h-4 w-4 text-primary" />
          </motion.div>
          AI Weekly Insights
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Mini metric bars - always visible */}
        <div className="grid grid-cols-2 gap-2.5">
          {statCards.map(({ icon: Icon, label, value, max, color }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.3 }}
              className="space-y-1 rounded-lg bg-muted/30 p-2"
            >
              <div className="flex items-center gap-1.5">
                <Icon className="h-3 w-3" style={{ color }} />
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
                <span className="ml-auto text-xs font-semibold">{value}</span>
              </div>
              <MiniBar value={value} max={max} color={color} />
            </motion.div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Initial state */}
          {!generated && !loading && (
            <motion.div
              key="initial"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center py-2"
            >
              <p className="text-xs text-muted-foreground mb-3">
                AI analyzes your patterns and generates actionable recommendations.
              </p>
              <Button onClick={handleGenerate} size="sm" className="gap-2 shadow-lg shadow-primary/20">
                <Sparkles className="h-3.5 w-3.5" />
                Generate Insights
              </Button>
            </motion.div>
          )}

          {/* Loading state */}
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <PulsingOrb />
              <motion.p
                className="text-center text-xs text-muted-foreground"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                Analyzing your week...
              </motion.p>
            </motion.div>
          )}

          {/* Results */}
          {insights && !loading && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-3"
            >
              <div className="relative rounded-lg bg-muted/20 p-3">
                <div className="absolute left-0 top-0 h-full w-0.5 rounded-full bg-gradient-to-b from-primary via-primary/50 to-transparent" />
                <div className="prose prose-xs dark:prose-invert max-w-none pl-2 text-[13px] leading-relaxed [&_strong]:text-primary [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-xs [&_p]:my-1.5 [&_ul]:my-1 [&_li]:my-0.5">
                  <ReactMarkdown>{insights}</ReactMarkdown>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleGenerate}
                className="gap-1.5 w-full text-xs text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className="h-3 w-3" />
                Regenerate
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}
