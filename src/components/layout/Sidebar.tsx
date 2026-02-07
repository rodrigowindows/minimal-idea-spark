import {
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Focus,
  Globe,
  LayoutDashboard,
  MessageSquare,
  PenTool,
  Sparkles,
  Target,
  BarChart3,
  Repeat,
  Flag,
  ClipboardCheck,
  Settings2,
  Building2,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAppContext } from '@/contexts/AppContext'
import { useTranslation } from '@/contexts/LanguageContext'
import type { TranslationKey } from '@/contexts/LanguageContext'
import { XPProgressBar } from '@/components/gamification/XPProgressBar'
import { WorkspaceSwitcher } from '@/components/WorkspaceSwitcher'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

const navItems: { to: string; icon: typeof LayoutDashboard; labelKey: TranslationKey }[] = [
  { to: '/', icon: LayoutDashboard, labelKey: 'dashboard' },
  { to: '/consultant', icon: MessageSquare, labelKey: 'consultant' },
  { to: '/opportunities', icon: Target, labelKey: 'opportunities' },
  { to: '/journal', icon: BookOpen, labelKey: 'journal' },
  { to: '/habits', icon: Repeat, labelKey: 'habits' },
  { to: '/goals', icon: Flag, labelKey: 'goals' },
  { to: '/calendar', icon: CalendarDays, labelKey: 'calendar' },
  { to: '/priorities', icon: Crosshair, labelKey: 'priorities' },
  { to: '/analytics', icon: BarChart3, labelKey: 'analytics' },
  { to: '/weekly-review', icon: ClipboardCheck, labelKey: 'weeklyReview' },
  { to: '/content-generator', icon: PenTool, labelKey: 'contentGenerator' },
  { to: '/workspace', icon: Building2, labelKey: 'workspace' },
  { to: '/settings', icon: Settings2, labelKey: 'settings' },
]

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { deepWorkMode, toggleDeepWorkMode } = useAppContext()
  const { language, toggleLanguage, t } = useTranslation()

  return (
    <aside
      className={cn(
        'flex h-screen flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Brand + Language Toggle */}
      <div className="flex h-16 items-center justify-between border-b border-border/50 px-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 shrink-0 text-primary" />
          {!collapsed && (
            <span className="text-lg font-semibold tracking-tight">Canvas</span>
          )}
        </div>
        <button
          onClick={toggleLanguage}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors',
            'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-muted-foreground',
            collapsed && 'px-1'
          )}
          title={t.switchLanguage}
        >
          <Globe className="h-4 w-4 shrink-0" />
          {!collapsed && (
            <span className="uppercase font-bold">{language === 'pt' ? '🇧🇷 PT' : '🇺🇸 EN'}</span>
          )}
        </button>
      </div>

      {/* Workspace Switcher */}
      <div className={cn('border-b border-border/50 px-2 py-2', collapsed && 'px-1')}>
        <WorkspaceSwitcher collapsed={collapsed} />
      </div>

      {/* XP Progress */}
      <div className={cn('px-2 py-3', collapsed && 'px-1')}>
        <XPProgressBar compact={collapsed} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
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
            {!collapsed && <span>{t[item.labelKey]}</span>}
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
          {!collapsed && <span>{t.deepWork}</span>}
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
              <span>{t.collapse}</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
