import { Outlet } from 'react-router-dom'
import { Toaster } from 'sonner'
import { cn } from '@/lib/utils'
import { useAppContext } from '@/contexts/AppContext'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  const { sidebarOpen, deepWorkMode, toggleSidebar } = useAppContext()
  const isMobile = !useMediaQuery('(min-width: 768px)')

  return (
    <div className="relative flex h-screen overflow-hidden bg-background">
      <Toaster
        theme="dark"
        position="top-right"
        toastOptions={{
          className: 'bg-card text-card-foreground border-border',
        }}
      />

      {/* Desktop sidebar */}
      {!isMobile && !deepWorkMode && (
        <Sidebar collapsed={!sidebarOpen} onToggle={toggleSidebar} />
      )}

      {/* Main content area */}
      <main
        className={cn(
          'flex-1 overflow-y-auto transition-all duration-300 ease-in-out',
          isMobile && !deepWorkMode && 'pb-16',
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
