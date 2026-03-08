import type { ReactNode } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import { QueryClientProvider } from '@tanstack/react-query'

import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AppProvider } from '@/contexts/AppContext'

import { LanguageProvider } from '@/contexts/LanguageContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { WarRoomLayoutProvider } from '@/contexts/WarRoomLayoutContext'
import { RealtimeProvider } from '@/contexts/RealtimeContext'
import { NightWorkerProvider } from '@/contexts/NightWorkerContext'
import { ShortcutProvider } from '@/contexts/ShortcutContext'
import { NetworkStatusProvider } from '@/contexts/NetworkStatusContext'

type ProviderProps = { children: ReactNode }
type ProviderComponent = (props: ProviderProps) => ReactNode

function composeProviders(...providers: ProviderComponent[]): ProviderComponent {
  return providers.reduce<ProviderComponent>(
    (Composed, Current) =>
      ({ children }) => (
        <Composed>
          <Current>{children}</Current>
        </Composed>
      ),
    ({ children }) => <>{children}</>,
  )
}

const AuthenticatedTree = composeProviders(
  ThemeProvider,
  NetworkStatusProvider,
  WarRoomLayoutProvider,
  LanguageProvider,
  AppProvider,
  ShortcutProvider,
  
  RealtimeProvider,
)

export function AuthenticatedProviders({ children }: ProviderProps) {
  return (
    <ErrorBoundary>
      <AuthenticatedTree>{children}</AuthenticatedTree>
    </ErrorBoundary>
  )
}

interface AppProvidersProps {
  queryClient: QueryClient
  children: ReactNode
}

export function AppProviders({ queryClient, children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner />
        <NightWorkerProvider>{children}</NightWorkerProvider>
      </TooltipProvider>
    </QueryClientProvider>
  )
}

