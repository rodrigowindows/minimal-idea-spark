import { motion } from 'framer-motion'
import { type ReactNode, useEffect } from 'react'
import { useLocation } from 'react-router-dom'

interface PageTransitionProps {
  children: ReactNode
}

export function PageTransition({ children }: PageTransitionProps) {
  const { pathname } = useLocation()

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.debug('[PageTransition] Mounting path:', pathname)
    }
  }, [pathname])

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0.3 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.08, ease: 'linear' }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  )
}
