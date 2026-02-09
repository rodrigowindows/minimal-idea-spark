import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '@/contexts/AppContext'
import { useShortcutContext } from '@/contexts/ShortcutContext'
import type { ShortcutDefinition } from '@/contexts/ShortcutContext'

/** All global shortcut definitions */
export const GLOBAL_SHORTCUTS: ShortcutDefinition[] = [
  // Single-key navigation
  { id: 'nav-dashboard', keys: ['N'], description: 'Dashboard (nova captura)', category: 'navigation', customizable: true },
  { id: 'nav-journal', keys: ['J'], description: 'Journal', category: 'navigation', customizable: true },
  { id: 'nav-consultant', keys: ['C'], description: 'Consultant', category: 'navigation', customizable: true },
  { id: 'search-focus', keys: ['/'], description: 'Busca global', category: 'global', customizable: true },
  { id: 'shortcuts-help', keys: ['?'], description: 'Mostrar atalhos', category: 'global' },
  { id: 'deep-work', keys: ['F'], description: 'Deep Work Mode', category: 'global', customizable: true },
  { id: 'escape', keys: ['Esc'], description: 'Sair Deep Work / fechar modal', category: 'modal', allowInInput: true },
  // Ctrl/Cmd combos
  { id: 'command-palette', keys: ['Ctrl', 'K'], description: 'Paleta de comandos', category: 'global', allowInInput: true },
  // Alt+number navigation
  { id: 'alt-1', keys: ['Alt', '1'], description: 'Dashboard', category: 'navigation' },
  { id: 'alt-2', keys: ['Alt', '2'], description: 'Consultant', category: 'navigation' },
  { id: 'alt-3', keys: ['Alt', '3'], description: 'Opportunities', category: 'navigation' },
  { id: 'alt-4', keys: ['Alt', '4'], description: 'Journal', category: 'navigation' },
  { id: 'alt-5', keys: ['Alt', '5'], description: 'Analytics', category: 'navigation' },
  { id: 'alt-6', keys: ['Alt', '6'], description: 'Habits', category: 'navigation' },
  { id: 'alt-7', keys: ['Alt', '7'], description: 'Goals', category: 'navigation' },
  { id: 'alt-8', keys: ['Alt', '8'], description: 'Weekly Review', category: 'navigation' },
  { id: 'alt-9', keys: ['Alt', '9'], description: 'Settings', category: 'navigation' },
]

export function useKeyboardShortcuts() {
  const navigate = useNavigate()
  const { toggleDeepWorkMode, deepWorkMode, setCommandPaletteOpen } = useAppContext()
  const { register, customBindings, toggleHelp } = useShortcutContext()

  // Register all global shortcuts with context
  useEffect(() => {
    const unregisters = GLOBAL_SHORTCUTS.map(def => register(def, () => {}))
    return () => unregisters.forEach(u => u())
  }, [register])

  useEffect(() => {
    // Build a lookup from custom key -> shortcut id
    const getKeyForShortcut = (id: string): string[] => {
      const custom = customBindings[id]
      if (custom) return custom
      const def = GLOBAL_SHORTCUTS.find(s => s.id === id)
      return def?.keys || []
    }

    function matchKeys(shortcutKeys: string[], e: KeyboardEvent): boolean {
      const hasMeta = shortcutKeys.includes('Ctrl') || shortcutKeys.includes('Cmd')
      const hasAlt = shortcutKeys.includes('Alt')
      const mainKey = shortcutKeys.filter(k => k !== 'Ctrl' && k !== 'Cmd' && k !== 'Alt')[0]

      if (!mainKey) return false

      if (hasMeta) {
        if (!(e.metaKey || e.ctrlKey)) return false
        return e.key.toLowerCase() === mainKey.toLowerCase()
      }
      if (hasAlt) {
        if (!e.altKey) return false
        return e.key === mainKey
      }
      // Single key match (no modifiers)
      if (e.ctrlKey || e.metaKey || e.altKey) return false
      if (mainKey === 'Esc') return e.key === 'Escape'
      if (mainKey === '?') return e.key === '?'
      if (mainKey === '/') return e.key === '/'
      return e.key.toLowerCase() === mainKey.toLowerCase()
    }

    function handleKeyDown(e: KeyboardEvent) {
      // Cmd+K / Ctrl+K opens command palette from anywhere
      if (matchKeys(getKeyForShortcut('command-palette'), e)) {
        e.preventDefault()
        setCommandPaletteOpen(true)
        return
      }

      const tag = (e.target as HTMLElement)?.tagName
      const isEditable = (e.target as HTMLElement)?.isContentEditable
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || isEditable

      // Escape works everywhere
      if (e.key === 'Escape') {
        if (deepWorkMode) {
          e.preventDefault()
          toggleDeepWorkMode()
        }
        return
      }

      // Skip other shortcuts when in input
      if (inInput) return
      if (deepWorkMode) return

      // Alt+number navigation
      if (e.altKey) {
        const altRoutes: Record<string, string> = {
          '1': '/', '2': '/consultant', '3': '/opportunities',
          '4': '/journal', '5': '/analytics', '6': '/habits',
          '7': '/goals', '8': '/weekly-review', '9': '/settings',
        }
        const altId = `alt-${e.key}`
        const altKeys = getKeyForShortcut(altId)
        if (altKeys.includes('Alt') && altRoutes[e.key]) {
          e.preventDefault()
          navigate(altRoutes[e.key])
          return
        }
      }

      // Single key shortcuts
      const singleKeyActions: Record<string, () => void> = {
        'nav-dashboard': () => navigate('/'),
        'nav-journal': () => navigate('/journal'),
        'nav-consultant': () => navigate('/consultant'),
        'search-focus': () => window.dispatchEvent(new CustomEvent('focus-global-search')),
        'shortcuts-help': () => toggleHelp(),
        'deep-work': () => toggleDeepWorkMode(),
      }

      for (const [id, action] of Object.entries(singleKeyActions)) {
        const keys = getKeyForShortcut(id)
        if (matchKeys(keys, e)) {
          e.preventDefault()
          action()
          return
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate, toggleDeepWorkMode, deepWorkMode, setCommandPaletteOpen, customBindings, toggleHelp])
}
