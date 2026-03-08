import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
// AnimatePresence removed — was causing full tree remounts on navigation
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
import { useRealtime } from '@/contexts/RealtimeContext'
import { SkipLink } from '@/components/SkipLink'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { KeyboardShortcutsHelp } from '@/components/layout/KeyboardShortcutsHelp'
import { SyncStatusIndicator } from '@/components/SyncStatusIndicator'
import { CommandPalette } from '@/components/CommandPalette'
import { useScrollToTopOnRouteChange } from '@/hooks/useScrollToTopOnRouteChange'
import { useScrollRestoration } from '@/hooks/useScrollRestoration'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AriaLiveRegion } from '@/components/AriaLiveRegion'
import { OfflineBanner } from '@/components/OfflineBanner'
import { useRouteAnnouncer } from '@/hooks/useRouteAnnouncer'
import { useBreadcrumbFromPath } from '@/components/layout/PageBreadcrumbs'
import { PageBreadcrumbs } from '@/components/layout/PageBreadcrumbs'
import { BackButton } from '@/components/layout/BackButton'
import { PageTransition } from '@/components/layout/PageTransition'

// Routes where breadcrumbs should not appear
const NO_BREADCRUMB_ROUTES = new Set(['/'])


export function AppLayout() {
  const { t } = useTranslation()
  const location = useLocation()
  const { sidebarOpen, deepWorkMode, toggleSidebar, setCommandPaletteOpen } = useAppContext()

  // Navigation performance tracking
  const navStartRef = useRef(performance.now())
  useEffect(() => {
    const elapsed = Math.round(performance.now() - navStartRef.current)
    console.log(`[Perf] Navigation to ${location.pathname} rendered in ${elapsed}ms`)
    navStartRef.current = performance.now()
  }, [location.pathname])
  useScrollToTopOnRouteChange()
  useScrollRestoration()
  useRouteAnnouncer()
  const breadcrumbs = useBreadcrumbFromPath()
  const showBreadcrumbs = !NO_BREADCRUMB_ROUTES.has(location.pathname) && !deepWorkMode
  const showBackButton = location.pathname.split('/').filter(Boolean).length > 1 && !deepWorkMode
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

      {ENABLE_COLLAB_CURSORS && isConnected && !deepWorkMode && (
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
              <div onClick={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest('a[href]')) {
                  setMobileOpen(false);
                }
              }}>
                <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} />
              </div>
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
          isMobile && !deepWorkMode && 'pt-14 pb-[calc(4rem+env(safe-area-inset-bottom))]',
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

        {showBreadcrumbs && (
          <div className="flex items-center gap-3 px-4 md:px-6 pt-3 pb-1">
            {showBackButton && <BackButton fallbackTo={`/${location.pathname.split('/').filter(Boolean)[0]}`} />}
            <PageBreadcrumbs items={breadcrumbs} />
          </div>
        )}

        <div className={cn('relative', deepWorkMode && 'z-20')}>
          <ErrorBoundary>
            <PageTransition>
              <Outlet />
            </PageTransition>
          </ErrorBoundary>
        </div>
      </main>

      {isMobile && !deepWorkMode && <MobileNav />}

      <CommandPalette />
      <KeyboardShortcutsHelp />
    </div>
  )
}
