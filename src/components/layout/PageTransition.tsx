import { type ReactNode } from 'react'
import { motion, AnimatePresence, type Transition } from 'framer-motion'
import { useLocation } from 'react-router-dom'

interface PageTransitionProps {
  children: ReactNode
}

const enterTransition: Transition = { duration: 0.25, ease: 'easeOut' }
const exitTransition: Transition = { duration: 0.15, ease: 'easeOut' }

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1, transition: enterTransition }}
        exit={{ opacity: 0, y: -8, scale: 0.99, transition: exitTransition }}
        className="w-full h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
