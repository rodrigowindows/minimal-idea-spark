import { motion } from 'framer-motion'
import { type ReactNode, useEffect } from 'react'

interface PageTransitionProps {
  children: ReactNode
  pathname: string
}

export function PageTransition({ children, pathname }: PageTransitionProps) {
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.debug('[PageTransition] Mounting path:', pathname)
    }
  }, [pathname])

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: 'linear' }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  )
}
