import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SuccessAnimationProps {
  show: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
  onComplete?: () => void
}

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
}

const iconSizes = {
  sm: 'h-3 w-3',
  md: 'h-5 w-5',
  lg: 'h-7 w-7',
}

export function SuccessAnimation({ show, size = 'md', className, onComplete }: SuccessAnimationProps) {
  if (!show) return null

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 20,
      }}
      onAnimationComplete={() => {
        setTimeout(() => onComplete?.(), 800)
      }}
      className={cn(
        'flex items-center justify-center rounded-full bg-green-500',
        sizeClasses[size],
        className
      )}
    >
      <motion.div
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        <Check className={cn('text-white', iconSizes[size])} strokeWidth={3} />
      </motion.div>
    </motion.div>
  )
}

export function SuccessRipple({ show, className }: { show: boolean; className?: string }) {
  if (!show) return null

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 1 }}
      animate={{ scale: 2, opacity: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={cn(
        'absolute inset-0 rounded-full border-2 border-green-500',
        className
      )}
    />
  )
}
