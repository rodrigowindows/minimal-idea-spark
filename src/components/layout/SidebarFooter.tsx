import { ChevronLeft, ChevronRight, Focus, Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/contexts/ThemeContext'

import { cn } from '@/lib/utils'

interface SidebarFooterProps {
  collapsed: boolean
  deepWorkMode: boolean
  onToggleDeepWork: () => void
  onToggleSidebar: () => void
}

export function SidebarFooter({
  collapsed,
  deepWorkMode,
  onToggleDeepWork,
  onToggleSidebar,
}: SidebarFooterProps) {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <div className="space-y-1 border-t border-border/50 p-2">
      <button
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        className={cn(
          'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
          'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          collapsed && 'justify-center px-2',
        )}
      >
        {theme === 'dark' ? (
          <Sun className="h-5 w-5 shrink-0" aria-hidden="true" />
        ) : (
          <Moon className="h-5 w-5 shrink-0" aria-hidden="true" />
        )}
        {!collapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
      </button>

      <button
        onClick={onToggleDeepWork}
        aria-label={t('nav.deepWork')}
        aria-pressed={deepWorkMode}
        className={cn(
          'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
          'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          deepWorkMode ? 'bg-primary/20 text-primary' : 'text-muted-foreground',
          collapsed && 'justify-center px-2',
        )}
      >
        <Focus className="h-5 w-5 shrink-0" aria-hidden="true" />
        {!collapsed && <span>{t('nav.deepWork')}</span>}
      </button>

      <button
        onClick={onToggleSidebar}
        aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
        aria-expanded={!collapsed}
        className={cn(
          'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors',
          'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          collapsed && 'justify-center px-2',
        )}
      >
        {collapsed ? (
          <ChevronRight className="h-5 w-5 shrink-0" aria-hidden="true" />
        ) : (
          <>
            <ChevronLeft className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>{t('nav.collapse')}</span>
          </>
        )}
      </button>
    </div>
  )
}
