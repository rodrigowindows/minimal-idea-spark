import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AnimatedStatCardProps {
  icon: LucideIcon
  label: string
  value: number
  suffix?: string
  color: string
  gradientFrom: string
  gradientTo: string
  delay?: number
}

function useAnimatedNumber(target: number, duration = 1200, delay = 0) {
  const [current, setCurrent] = useState(0)
  useEffect(() => {
    const timeout = setTimeout(() => {
      const start = performance.now()
      const step = (now: number) => {
        const elapsed = now - start
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
        setCurrent(Math.round(eased * target))
        if (progress < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    }, delay)
    return () => clearTimeout(timeout)
  }, [target, duration, delay])
  return current
}

export function AnimatedStatCard({
  icon: Icon,
  label,
  value,
  suffix = '',
  color,
  gradientFrom,
  gradientTo,
  delay = 0,
}: AnimatedStatCardProps) {
  const animatedValue = useAnimatedNumber(value, 1000, delay)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay: delay / 1000, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-xl border border-border/50 bg-card p-4 group hover:border-border transition-colors"
    >
      {/* Background glow */}
      <div
        className={cn(
          'absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-30',
          `bg-gradient-to-br ${gradientFrom} ${gradientTo}`
        )}
      />

      <div className="relative flex items-center gap-3">
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', `bg-gradient-to-br ${gradientFrom} ${gradientTo}`)}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground truncate">{label}</p>
          <p className={cn('text-xl font-bold tabular-nums tracking-tight', color)}>
            {animatedValue.toLocaleString()}{suffix}
          </p>
        </div>
      </div>
    </motion.div>
  )
}
