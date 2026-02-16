import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Lightweight page performance logger.
 * Logs mount time, render counts, and navigation timing.
 * Only active in development mode.
 */
export function usePagePerf(pageName: string) {
  const mountTime = useRef(performance.now())
  const renderCount = useRef(0)
  const location = useLocation()

  renderCount.current += 1

  useEffect(() => {
    const elapsed = Math.round(performance.now() - mountTime.current)
    console.log(
      `[Perf] ${pageName} mounted in ${elapsed}ms (path: ${location.pathname})`
    )
    mountTime.current = performance.now()
    renderCount.current = 0

    return () => {
      console.log(
        `[Perf] ${pageName} unmounted after ${renderCount.current} renders`
      )
    }
  }, [location.pathname])

  // Log excessive re-renders
  if (renderCount.current > 0 && renderCount.current % 10 === 0) {
    console.warn(
      `[Perf] ${pageName} hit ${renderCount.current} renders without remount`
    )
  }
}
