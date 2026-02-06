import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '@/contexts/AppContext'

export function useKeyboardShortcuts() {
  const navigate = useNavigate()
  const { toggleDeepWorkMode, deepWorkMode } = useAppContext()

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Skip if user is typing in an input
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (deepWorkMode && e.key !== 'Escape') return

      // Navigation shortcuts (Alt + key)
      if (e.altKey) {
        switch (e.key) {
          case '1': e.preventDefault(); navigate('/'); break
          case '2': e.preventDefault(); navigate('/consultant'); break
          case '3': e.preventDefault(); navigate('/opportunities'); break
          case '4': e.preventDefault(); navigate('/journal'); break
          case '5': e.preventDefault(); navigate('/analytics'); break
          case '6': e.preventDefault(); navigate('/habits'); break
          case '7': e.preventDefault(); navigate('/goals'); break
          case '8': e.preventDefault(); navigate('/weekly-review'); break
          case '9': e.preventDefault(); navigate('/settings'); break
        }
        return
      }

      // Global shortcuts
      switch (e.key) {
        case 'f':
          if (e.ctrlKey || e.metaKey) return // let browser handle Ctrl+F
          e.preventDefault()
          toggleDeepWorkMode()
          break
        case '?':
          e.preventDefault()
          // Toggle shortcuts help via custom event
          window.dispatchEvent(new CustomEvent('toggle-shortcuts-help'))
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate, toggleDeepWorkMode, deepWorkMode])
}
