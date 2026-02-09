import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

export interface ShortcutDefinition {
  id: string
  keys: string[]
  description: string
  category: 'navigation' | 'global' | 'page' | 'modal'
  /** When true, this shortcut can be re-bound by the user */
  customizable?: boolean
  /** If true, shortcut fires even when typing in inputs (e.g. Escape) */
  allowInInput?: boolean
}

interface ShortcutRegistration {
  definition: ShortcutDefinition
  handler: () => void
}

interface ShortcutContextValue {
  /** All currently registered shortcuts */
  shortcuts: ShortcutDefinition[]
  /** Register a shortcut with its handler. Returns unregister fn */
  register: (def: ShortcutDefinition, handler: () => void) => () => void
  /** User-customized key bindings: shortcutId -> keys[] */
  customBindings: Record<string, string[]>
  /** Update a custom binding */
  setCustomBinding: (shortcutId: string, keys: string[]) => void
  /** Reset a custom binding to default */
  resetBinding: (shortcutId: string) => void
  /** Reset all bindings to default */
  resetAllBindings: () => void
  /** Whether shortcuts help dialog is open */
  helpOpen: boolean
  setHelpOpen: (open: boolean) => void
  toggleHelp: () => void
}

const STORAGE_KEY = 'lifeos_shortcut_bindings'

const ShortcutContext = createContext<ShortcutContextValue | undefined>(undefined)

function loadBindings(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveBindings(bindings: Record<string, string[]>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings))
}

export function ShortcutProvider({ children }: { children: ReactNode }) {
  const registrations = useRef<Map<string, ShortcutRegistration>>(new Map())
  const [shortcuts, setShortcuts] = useState<ShortcutDefinition[]>([])
  const [customBindings, setCustomBindings] = useState<Record<string, string[]>>(loadBindings)
  const [helpOpen, setHelpOpen] = useState(false)
  const toggleHelp = useCallback(() => setHelpOpen(prev => !prev), [])

  const register = useCallback((def: ShortcutDefinition, handler: () => void) => {
    registrations.current.set(def.id, { definition: def, handler })
    setShortcuts(prev => {
      if (prev.some(s => s.id === def.id)) return prev
      return [...prev, def]
    })
    return () => {
      registrations.current.delete(def.id)
      setShortcuts(prev => prev.filter(s => s.id !== def.id))
    }
  }, [])

  const setCustomBinding = useCallback((shortcutId: string, keys: string[]) => {
    setCustomBindings(prev => {
      const next = { ...prev, [shortcutId]: keys }
      saveBindings(next)
      return next
    })
  }, [])

  const resetBinding = useCallback((shortcutId: string) => {
    setCustomBindings(prev => {
      const next = { ...prev }
      delete next[shortcutId]
      saveBindings(next)
      return next
    })
  }, [])

  const resetAllBindings = useCallback(() => {
    setCustomBindings({})
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  // Listen for toggle-shortcuts-help event
  useEffect(() => {
    function handler() {
      setHelpOpen(prev => !prev)
    }
    window.addEventListener('toggle-shortcuts-help', handler)
    return () => window.removeEventListener('toggle-shortcuts-help', handler)
  }, [])

  const value = useMemo<ShortcutContextValue>(() => ({
    shortcuts,
    register,
    customBindings,
    setCustomBinding,
    resetBinding,
    resetAllBindings,
    helpOpen,
    setHelpOpen,
    toggleHelp,
  }), [shortcuts, register, customBindings, setCustomBinding, resetBinding, resetAllBindings, helpOpen, toggleHelp])

  return (
    <ShortcutContext.Provider value={value}>
      {children}
    </ShortcutContext.Provider>
  )
}

export function useShortcutContext(): ShortcutContextValue {
  const context = useContext(ShortcutContext)
  if (!context) throw new Error('useShortcutContext must be used within ShortcutProvider')
  return context
}

/**
 * Get the effective keys for a shortcut, taking into account custom bindings.
 */
export function getEffectiveKeys(
  def: ShortcutDefinition,
  customBindings: Record<string, string[]>,
): string[] {
  return customBindings[def.id] || def.keys
}
