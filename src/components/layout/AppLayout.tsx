import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Toaster } from 'sonner'
import { Menu, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppContext } from '@/contexts/AppContext'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet'
import { MobileNav } from '@/components/MobileNav'
import { Sidebar } from './Sidebar'
import { PresenceIndicator } from '@/components/PresenceIndicator'
import { NotificationCenter } from '@/components/NotificationCenter'
import { CollaborativeCursor } from '@/components/CollaborativeCursor'
import { useRealtime } from '@/contexts/RealtimeContext'
import { SkipLink } from '@/components/SkipLink'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { KeyboardShortcutsHelp } from '@/components/layout/KeyboardShortcutsHelp'
import { SyncStatusIndicator } from '@/components/SyncStatusIndicator'
import { CommandPalette } from '@/components/CommandPalette'
import { useScrollToTopOnRouteChange } from '@/hooks/useScrollToTopOnRouteChange'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AriaLiveRegion } from '@/components/AriaLiveRegion'
import { OfflineBanner } from '@/components/OfflineBanner'
import { useRouteAnnouncer } from '@/hooks/useRouteAnnouncer'

export function AppLayout() {
  const { t } = useTranslation()
  const { sidebarOpen, deepWorkMode, toggleSidebar, setCommandPaletteOpen } = useAppContext()
  useScrollToTopOnRouteChange()
  useRouteAnnouncer()
  const isMobile = !useMediaQuery('(min-width: 768px)')
  const [mobileOpen, setMobileOpen] = useState(false)
  const { presences, currentUserId, isConnected } = useRealtime()
  useKeyboardShortcuts()

  return (
    <div className="relative flex h-screen overflow-hidden bg-background">
      <SkipLink />
      <AriaLiveRegion />
      <OfflineBanner />
      <Toaster
        theme="dark"
        position="top-right"
        toastOptions={{
          className: 'bg-card text-card-foreground border-border',
        }}
      />

      {isConnected && !deepWorkMode && (
        <CollaborativeCursor presences={presences} currentUserId={currentUserId} />
      )}

      {isMobile && !deepWorkMode && (
        <>
          <header className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-b border-border/50 bg-sidebar/95 backdrop-blur-md px-3" role="banner" aria-label={t('layout.mobileHeader') || 'Mobile header'}>
            <Button
              variant="ghost"
              size="icon"
              className="min-h-[44px] min-w-[44px] touch-manipulation"
              onClick={() => setMobileOpen(true)}
              aria-label={t('layout.openMenu')}
              aria-expanded={mobileOpen}
              aria-controls="mobile-sidebar"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="min-h-[44px] min-w-[44px] touch-manipulation"
              onClick={() => setCommandPaletteOpen(true)}
              aria-label={t('layout.search') || 'Search'}
            >
              <Search className="h-5 w-5" aria-hidden="true" />
            </Button>
            <div className="flex items-center gap-1">
              <SyncStatusIndicator className="shrink-0" />
              <NotificationCenter />
              <PresenceIndicator presences={presences} currentUserId={currentUserId} maxDisplay={3} />
            </div>
          </header>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetContent side="left" className="w-64 p-0" id="mobile-sidebar">
              <SheetTitle className="sr-only">{t('layout.navigation')}</SheetTitle>
              <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
        </>
      )}

      {!isMobile && !deepWorkMode && (
        <Sidebar collapsed={!sidebarOpen} onToggle={toggleSidebar} />
      )}

      <main
        id="main-content"
        tabIndex={-1}
        role="main"
        aria-label={t('layout.mainContent') || 'Main content'}
        className={cn(
          'min-w-0 flex-1 overflow-y-auto overflow-x-hidden transition-all duration-300 ease-in-out',
          isMobile && !deepWorkMode && 'pt-14 pb-16',
          deepWorkMode && 'bg-background/95'
        )}
      >
        {!isMobile && !deepWorkMode && (
          <div className="sticky top-0 z-30 flex items-center justify-end gap-2 px-4 py-2 bg-background/80 backdrop-blur-sm border-b border-border/30">
            <SyncStatusIndicator showBar className="mr-auto" />
            {presences.filter(p => p.user_id !== currentUserId).length > 0 && (
              <PresenceIndicator presences={presences} currentUserId={currentUserId} maxDisplay={5} />
            )}
          </div>
        )}

        {deepWorkMode && (
          <div className="pointer-events-none fixed inset-0 z-10 bg-gradient-to-b from-background/80 via-transparent to-background/80" aria-hidden="true" />
        )}

        <div className={cn('relative', deepWorkMode && 'z-20')}>
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>

      {isMobile && !deepWorkMode && <MobileNav />}

      <CommandPalette />
      <KeyboardShortcutsHelp />
    </div>
  )
}
