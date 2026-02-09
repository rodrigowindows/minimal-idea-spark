import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Opportunity } from '@/types'
import { useMediaQuery } from '@/hooks/useMediaQuery'

/**
 * Global UI state: sidebar, deep work mode, current opportunity, level-up animation, command palette.
 * Used by AppLayout, Sidebar, Dashboard, CommandPalette and keyboard shortcuts.
 */
interface AppContextValue {
  sidebarOpen: boolean
  deepWorkMode: boolean
  currentOpportunity: Opportunity | null
  levelUpTriggered: boolean
  commandPaletteOpen: boolean
  setCommandPaletteOpen: (open: boolean) => void
  toggleSidebar: () => void
  toggleDeepWorkMode: () => void
  setCurrentOpportunity: (opportunity: Opportunity | null) => void
  triggerLevelUp: () => void
}

const AppContext = createContext<AppContextValue | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [sidebarOpen, setSidebarOpen] = useState(isDesktop)
  const [deepWorkMode, setDeepWorkMode] = useState(false)
  const [currentOpportunity, setCurrentOpportunity] = useState<Opportunity | null>(null)
  const [levelUpTriggered, setLevelUpTriggered] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), [])
  const toggleDeepWorkMode = useCallback(() => setDeepWorkMode(prev => !prev), [])

  const triggerLevelUp = useCallback(() => {
    setLevelUpTriggered(true)
    setTimeout(() => setLevelUpTriggered(false), 3500)
  }, [])

  const value = useMemo<AppContextValue>(() => ({
    sidebarOpen, deepWorkMode, currentOpportunity, levelUpTriggered,
    commandPaletteOpen, setCommandPaletteOpen,
    toggleSidebar, toggleDeepWorkMode, setCurrentOpportunity, triggerLevelUp,
  }), [
    sidebarOpen, deepWorkMode, currentOpportunity, levelUpTriggered,
    commandPaletteOpen, toggleSidebar, toggleDeepWorkMode, triggerLevelUp,
  ])

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext(): AppContextValue {
  const context = useContext(AppContext)
  if (context === undefined) throw new Error('useAppContext must be used within an AppProvider')
  return context
}
