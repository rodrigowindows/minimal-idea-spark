import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { onXPEvent } from '@/hooks/useXPSystem'
import { useAppContext } from '@/contexts/AppContext'
import { Zap, Trophy } from 'lucide-react'

interface XPNotification {
  id: number
  type: 'xp_gained' | 'level_up' | 'achievement'
  amount?: number
  level?: number
  achievementName?: string
}

let notifId = 0

export function XPNotificationListener() {
  const [notifications, setNotifications] = useState<XPNotification[]>([])
  const { triggerLevelUp } = useAppContext()

  useEffect(() => {
    return onXPEvent((event) => {
      if (event.type === 'xp_gained' && event.amount) {
        const id = ++notifId
        setNotifications(prev => [...prev, { id, type: 'xp_gained', amount: event.amount }])
        setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== id))
        }, 2000)
      }
      if (event.type === 'level_up' && event.level) {
        triggerLevelUp()
        const id = ++notifId
        setNotifications(prev => [...prev, { id, type: 'level_up', level: event.level }])
        setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== id))
        }, 3500)
      }
      if (event.type === 'achievement' && event.achievement) {
        const id = ++notifId
        setNotifications(prev => [...prev, {
          id,
          type: 'achievement',
          achievementName: event.achievement!.name,
          amount: event.achievement!.xp_reward,
        }])
        setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== id))
        }, 4000)
      }
    })
  }, [triggerLevelUp])

  return (
    <div className="pointer-events-none fixed top-4 right-4 z-[90] flex flex-col items-end gap-2">
      <AnimatePresence>
        {notifications.map((notif) => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, x: 50, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.6 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            {notif.type === 'xp_gained' && (
              <div className="flex items-center gap-2 rounded-full bg-amber-500/20 backdrop-blur-sm border border-amber-500/30 px-4 py-2 shadow-lg">
                <Zap className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-bold text-amber-400">+{notif.amount} XP</span>
              </div>
            )}
            {notif.type === 'level_up' && (
              <div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500/30 to-orange-500/30 backdrop-blur-sm border border-amber-500/40 px-5 py-3 shadow-lg">
                <span className="text-lg font-bold text-amber-400">Level {notif.level}!</span>
              </div>
            )}
            {notif.type === 'achievement' && (
              <div className="flex items-center gap-2 rounded-full bg-purple-500/20 backdrop-blur-sm border border-purple-500/30 px-4 py-2 shadow-lg">
                <Trophy className="h-4 w-4 text-purple-400" />
                <span className="text-sm font-bold text-purple-400">{notif.achievementName}</span>
                {notif.amount && (
                  <span className="text-xs text-amber-400">+{notif.amount} XP</span>
                )}
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
