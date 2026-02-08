import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Announces route changes to screen readers in a SPA.
 * Updates the aria-live region with the current page title when navigating.
 */
export function useRouteAnnouncer() {
  const location = useLocation()

  useEffect(() => {
    // Small delay to let the page render and update the document title / h1
    const timer = setTimeout(() => {
      const heading = document.querySelector<HTMLElement>('#page-title, h1')
      const pageTitle = heading?.textContent || document.title || 'Page loaded'

      const region = document.getElementById('aria-live-polite')
      if (region) {
        region.textContent = ''
        requestAnimationFrame(() => {
          region.textContent = `Navigated to ${pageTitle}`
        })
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [location.pathname])
}
