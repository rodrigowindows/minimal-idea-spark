import { useCallback, useRef } from 'react'

/**
 * Hook for announcing messages to screen readers via aria-live regions.
 * Creates a visually hidden live region and provides a function to announce messages.
 */
export function useAriaLive() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    // Clear previous timeout
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    const id = `aria-live-${priority}`
    let region = document.getElementById(id)

    if (!region) {
      region = document.createElement('div')
      region.id = id
      region.setAttribute('role', priority === 'assertive' ? 'alert' : 'status')
      region.setAttribute('aria-live', priority)
      region.setAttribute('aria-atomic', 'true')
      region.className = 'sr-only'
      document.body.appendChild(region)
    }

    // Clear then set (ensures re-announcement of same message)
    region.textContent = ''
    timeoutRef.current = setTimeout(() => {
      region!.textContent = message
    }, 100)
  }, [])

  return announce
}
