import { useEffect, useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppContext } from '@/contexts/AppContext'
import { PomodoroTimer } from './PomodoroTimer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { X, Target, Star, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useXPSystem } from '@/hooks/useXPSystem'
import { useFocusSessions } from '@/hooks/useFocusSessions'
import { calculateXPReward } from '@/lib/constants'
import { useAuth } from '@/contexts/AuthContext'

export function DeepWorkOverlay() {
  const { user } = useAuth()
  const currentUserId = user?.id ?? 'mock-user-001'
  const { deepWorkMode, currentOpportunity, toggleDeepWorkMode, setCurrentOpportunity } = useAppContext()
  const { addXP } = useXPSystem()
  const { addSession } = useFocusSessions()
  const [xpEarned, setXpEarned] = useState(0)

  const handleClose = useCallback(() => {
    toggleDeepWorkMode()
    setCurrentOpportunity(null)
    setXpEarned(0)
  }, [toggleDeepWorkMode, setCurrentOpportunity])

  const handleSessionComplete = useCallback((minutes: number) => {
    const bonusXP = minutes * 2
    let totalXP = bonusXP

    if (currentOpportunity) {
      const taskXP = calculateXPReward(currentOpportunity.type, currentOpportunity.strategic_value ?? 5)
      totalXP += Math.round(taskXP * 0.25)
    }

    addXP(totalXP)
    setXpEarned(prev => prev + totalXP)

    // Save focus session to persistent storage
    addSession({
      user_id: currentUserId,
      opportunity_id: currentOpportunity?.id ?? null,
      duration_minutes: minutes,
      started_at: new Date(Date.now() - minutes * 60000).toISOString(),
      notes: currentOpportunity ? `Focus on: ${currentOpportunity.title}` : null,
      xp_earned: totalXP,
    })
  }, [addXP, currentOpportunity, addSession])

  useEffect(() => {
    if (!deepWorkMode) return
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [deepWorkMode, handleClose])

  if (!deepWorkMode) return null

  const priorityStars = currentOpportunity ? Math.min(Math.max(Math.round(currentOpportunity.priority / 2), 1), 5) : 0

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background via-transparent to-background opacity-50" />

      <Button variant="ghost" size="icon" onClick={handleClose} className="absolute right-4 top-4 z-10 rounded-full">
        <X className="h-5 w-5" /><span className="sr-only">Exit</span>
      </Button>

      <div className="relative z-10 flex flex-col items-center gap-8 px-4">
        {currentOpportunity ? (
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-5 w-5 text-primary" />Current Focus
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight">{currentOpportunity.title}</h2>
              {currentOpportunity.description && (
                <p className="text-sm text-muted-foreground">{currentOpportunity.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="secondary" className="capitalize">{currentOpportunity.type}</Badge>
                <Badge variant="outline" className="capitalize">{currentOpportunity.status}</Badge>
                {currentOpportunity.strategic_value && (
                  <Badge className="gap-1 bg-amber-500/20 text-amber-400 border-0">
                    SV: {currentOpportunity.strategic_value}/10
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                <span className="mr-1 text-xs font-medium text-muted-foreground">Priority</span>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={cn('h-4 w-4', i < priorityStars ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30')} />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight">Deep Work Mode</h2>
            <p className="mt-2 text-muted-foreground">Focus without distractions.</p>
          </div>
        )}

        <PomodoroTimer onSessionComplete={handleSessionComplete} />

        {xpEarned > 0 && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-400" />
            <span className="text-lg font-bold text-amber-400">+{xpEarned} XP earned this session</span>
          </motion.div>
        )}

        <p className="text-xs text-muted-foreground">
          Press <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">Esc</kbd> or click X to exit
        </p>
      </div>
    </motion.div>
  )
}
