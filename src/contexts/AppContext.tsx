import { createContext, useCallback, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import type { Opportunity } from '@/types'
import { useMediaQuery } from '@/hooks/useMediaQuery'

interface AppContextValue {
  sidebarOpen: boolean
  deepWorkMode: boolean
  currentOpportunity: Opportunity | null
  toggleSidebar: () => void
  toggleDeepWorkMode: () => void
  setCurrentOpportunity: (opportunity: Opportunity | null) => void
}

const AppContext = createContext<AppContextValue | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [sidebarOpen, setSidebarOpen] = useState(isDesktop)
  const [deepWorkMode, setDeepWorkMode] = useState(false)
  const [currentOpportunity, setCurrentOpportunity] = useState<Opportunity | null>(null)

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev)
  }, [])

  const toggleDeepWorkMode = useCallback(() => {
    setDeepWorkMode((prev) => !prev)
  }, [])

  return (
    <AppContext.Provider
      value={{
        sidebarOpen,
        deepWorkMode,
        currentOpportunity,
        toggleSidebar,
        toggleDeepWorkMode,
        setCurrentOpportunity,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext(): AppContextValue {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider')
  }
  return context
}
