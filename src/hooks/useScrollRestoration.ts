import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

const scrollPositions = new Map<string, number>()

/**
 * Saves scroll position when leaving a route and restores it when returning.
 * Attach to the scrollable element (default: #main-content).
 */
export function useScrollRestoration() {
  const { pathname } = useLocation()
  const prevPath = useRef(pathname)

  useEffect(() => {
    const main = document.getElementById('main-content')
    if (!main) return

    // Save position for previous path
    if (prevPath.current !== pathname) {
      scrollPositions.set(prevPath.current, main.scrollTop)
      prevPath.current = pathname
    }

    // Restore position for current path (if we have one saved)
    const saved = scrollPositions.get(pathname)
    if (saved !== undefined) {
      requestAnimationFrame(() => {
        main.scrollTo({ top: saved, behavior: 'instant' as ScrollBehavior })
      })
    }
  }, [pathname])
}
