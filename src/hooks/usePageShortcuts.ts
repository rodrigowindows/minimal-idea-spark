import { useEffect } from 'react'
import { useShortcutContext } from '@/contexts/ShortcutContext'
import type { ShortcutDefinition } from '@/contexts/ShortcutContext'

interface PageShortcut {
  definition: ShortcutDefinition
  handler: () => void
}

/**
 * Register page-specific keyboard shortcuts.
 * Shortcuts are automatically unregistered when the page unmounts.
 */
export function usePageShortcuts(shortcuts: PageShortcut[]) {
  const { register } = useShortcutContext()

  useEffect(() => {
    const unregisters: (() => void)[] = []

    for (const { definition, handler } of shortcuts) {
      unregisters.push(register(definition, handler))
    }

    // Set up the keydown listener for page-specific shortcuts
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      const isEditable = (e.target as HTMLElement)?.isContentEditable
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || isEditable

      for (const { definition, handler } of shortcuts) {
        if (inInput && !definition.allowInInput) continue

        const keys = definition.keys
        const hasMeta = keys.includes('Ctrl') || keys.includes('Cmd')
        const hasAlt = keys.includes('Alt')
        const mainKey = keys.filter(k => k !== 'Ctrl' && k !== 'Cmd' && k !== 'Alt')[0]

        if (!mainKey) continue

        let match = false
        if (hasMeta) {
          match = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === mainKey.toLowerCase()
        } else if (hasAlt) {
          match = e.altKey && e.key === mainKey
        } else {
          if (e.ctrlKey || e.metaKey || e.altKey) continue
          if (mainKey === 'ArrowLeft') match = e.key === 'ArrowLeft'
          else if (mainKey === 'ArrowRight') match = e.key === 'ArrowRight'
          else if (mainKey === 'ArrowUp') match = e.key === 'ArrowUp'
          else if (mainKey === 'ArrowDown') match = e.key === 'ArrowDown'
          else if (mainKey === 'Enter') match = e.key === 'Enter'
          else if (mainKey === 'T') match = e.key.toLowerCase() === 't'
          else match = e.key.toLowerCase() === mainKey.toLowerCase()
        }

        if (match) {
          e.preventDefault()
          handler()
          return
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      unregisters.forEach(u => u())
    }
    // We intentionally use a stable reference. Shortcuts array should be memoized by the caller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [register, shortcuts])
}
