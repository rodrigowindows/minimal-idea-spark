import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Focus,
  LayoutDashboard,
  MessageSquare,
  Sparkles,
  Target,
  BarChart3,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAppContext } from '@/contexts/AppContext'
import { XPProgressBar } from '@/components/gamification/XPProgressBar'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/consultant', icon: MessageSquare, label: 'Consultant' },
  { to: '/opportunities', icon: Target, label: 'Opportunities' },
  { to: '/journal', icon: BookOpen, label: 'Journal' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
]

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { deepWorkMode, toggleDeepWorkMode } = useAppContext()

  return (
    <aside
      className={cn(
        'flex h-screen flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Brand */}
      <div className="flex h-16 items-center gap-2 border-b border-border/50 px-4">
        <Sparkles className="h-6 w-6 shrink-0 text-primary" />
        {!collapsed && (
          <span className="text-lg font-semibold tracking-tight">Canvas</span>
        )}
      </div>

      {/* XP Progress */}
      <div className={cn('px-2 py-3', collapsed && 'px-1')}>
        <XPProgressBar compact={collapsed} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-muted-foreground',
                collapsed && 'justify-center px-2'
              )
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="space-y-1 border-t border-border/50 p-2">
        {/* Deep Work Mode toggle */}
        <button
          onClick={toggleDeepWorkMode}
          className={cn(
            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
            'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            deepWorkMode
              ? 'bg-primary/20 text-primary'
              : 'text-muted-foreground',
            collapsed && 'justify-center px-2'
          )}
        >
          <Focus className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Deep Work</span>}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          className={cn(
            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors',
            'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            collapsed && 'justify-center px-2'
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5 shrink-0" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5 shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
