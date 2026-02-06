import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { onXPEvent } from '@/hooks/useXPSystem'
import { useAppContext } from '@/contexts/AppContext'
import { Zap, Trophy, Star } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { GAMIFICATION_CONFIG } from '@/lib/constants'

interface FloatingNotification {
  id: number
  type: 'xp' | 'level' | 'achievement'
  amount?: number
  level?: number
  name?: string
  xpReward?: number
}

export function XPNotificationOverlay() {
  const [notifications, setNotifications] = useState<FloatingNotification[]>([])
  const { triggerLevelUp } = useAppContext()

  const addNotification = useCallback((n: FloatingNotification) => {
    setNotifications(prev => [...prev, n])
    setTimeout(() => {
      setNotifications(prev => prev.filter(x => x.id !== n.id))
    }, 2500)
  }, [])

  useEffect(() => {
    const unsubscribe = onXPEvent(event => {
      if (event.type === 'xp_gained' && event.amount) {
        addNotification({
          id: Date.now() + Math.random(),
          type: 'xp',
          amount: event.amount,
        })
      }

      if (event.type === 'level_up' && event.level) {
        triggerLevelUp()
        const title = GAMIFICATION_CONFIG.LEVEL_TITLES[Math.min(event.level - 1, GAMIFICATION_CONFIG.LEVEL_TITLES.length - 1)]
        toast.success(
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500">
              <Star className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-bold">Level Up!</p>
              <p className="text-sm text-muted-foreground">Level {event.level} - {title}</p>
            </div>
          </div>
        )
      }

      if (event.type === 'achievement' && event.achievement) {
        toast.success(
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-bold">Achievement Unlocked!</p>
              <p className="text-sm text-muted-foreground">
                {event.achievement.name} - +{event.achievement.xp_reward} XP
              </p>
            </div>
          </div>
        )
      }
    })
    return unsubscribe
  }, [addNotification, triggerLevelUp])

  return (
    <div className="pointer-events-none fixed inset-0 z-[90] overflow-hidden">
      <AnimatePresence>
        {notifications.map(n => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, y: 0, x: '-50%', scale: 0.5 }}
            animate={{ opacity: 1, y: -60, scale: 1 }}
            exit={{ opacity: 0, y: -120, scale: 0.8 }}
            transition={{ duration: 1.8, ease: 'easeOut' }}
            className="absolute left-1/2 top-20 flex items-center gap-1.5"
          >
            <Zap className="h-5 w-5 text-amber-400" />
            <span className="text-xl font-bold text-amber-400 drop-shadow-lg">
              +{n.amount} XP
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
