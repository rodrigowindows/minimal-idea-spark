import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Scroll main content to top when route changes. */
export function useScrollToTopOnRouteChange() {
  const { pathname } = useLocation()

  useEffect(() => {
    const main = document.getElementById('main-content')
    if (main) {
      main.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [pathname])
}
