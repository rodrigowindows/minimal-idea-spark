import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppContext } from '@/contexts/AppContext'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet'
import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  const { sidebarOpen, deepWorkMode, toggleSidebar } = useAppContext()
  const isMobile = !useMediaQuery('(min-width: 768px)')
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="relative flex h-screen overflow-hidden bg-background">
      <Toaster
        theme="dark"
        position="top-right"
        toastOptions={{
          className: 'bg-card text-card-foreground border-border',
        }}
      />

      {/* Mobile sidebar (Sheet drawer) */}
      {isMobile && !deepWorkMode && (
        <>
          <div className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center border-b border-border/50 bg-sidebar/95 backdrop-blur-md px-3">
            <Button
              variant="ghost"
              size="icon"
              className="min-h-[44px] min-w-[44px] touch-manipulation"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </div>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetContent side="left" className="w-64 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <Sidebar
                collapsed={false}
                onToggle={() => setMobileOpen(false)}
              />
            </SheetContent>
          </Sheet>
        </>
      )}

      {/* Desktop sidebar */}
      {!isMobile && !deepWorkMode && (
        <Sidebar collapsed={!sidebarOpen} onToggle={toggleSidebar} />
      )}

      {/* Main content area */}
      <main
        className={cn(
          'flex-1 overflow-y-auto transition-all duration-300 ease-in-out',
          isMobile && !deepWorkMode && 'pt-14 pb-16',
          deepWorkMode && 'bg-background/95'
        )}
      >
        {/* Deep Work Mode overlay gradient */}
        {deepWorkMode && (
          <div className="pointer-events-none fixed inset-0 z-10 bg-gradient-to-b from-background/80 via-transparent to-background/80" />
        )}

        <div className={cn('relative', deepWorkMode && 'z-20')}>
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      {isMobile && !deepWorkMode && <BottomNav />}
    </div>
  )
}
