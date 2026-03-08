import { useState, useEffect } from 'react'
import { Keyboard, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useShortcutContext } from '@/contexts/ShortcutContext'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const HINT_DISMISSED_KEY = 'lifeos_shortcuts_hint_dismissed'

export function FloatingShortcutsHint() {
  const [visible, setVisible] = useState(false)
  const { setHelpOpen } = useShortcutContext()

  useEffect(() => {
    const dismissed = localStorage.getItem(HINT_DISMISSED_KEY)
    if (dismissed === 'true') return

    // Show after a short delay for new users
    const timer = setTimeout(() => {
      setVisible(true)
    }, 3000)

    // Auto-hide after 10 seconds
    const autoHide = setTimeout(() => {
      setVisible(false)
    }, 13000)

    return () => {
      clearTimeout(timer)
      clearTimeout(autoHide)
    }
  }, [])

  const handleDismiss = () => {
    localStorage.setItem(HINT_DISMISSED_KEY, 'true')
    setVisible(false)
  }

  const handleOpenShortcuts = () => {
    setHelpOpen(true)
    handleDismiss()
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={cn(
            'fixed bottom-4 right-4 z-50',
            'max-w-xs p-3 rounded-xl',
            'bg-card border border-border shadow-lg',
            'backdrop-blur-sm'
          )}
        >
          <button
            onClick={handleDismiss}
            className="absolute -top-2 -right-2 p-1 rounded-full bg-muted hover:bg-muted-foreground/20 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-3 w-3" />
          </button>

          <div className="flex items-start gap-3">
            <div className="shrink-0 p-2 rounded-lg bg-primary/10">
              <Keyboard className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Keyboard shortcuts</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Press <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">?</kbd> anytime to see all shortcuts
              </p>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 mt-1.5 text-xs"
                onClick={handleOpenShortcuts}
              >
                View all shortcuts →
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
