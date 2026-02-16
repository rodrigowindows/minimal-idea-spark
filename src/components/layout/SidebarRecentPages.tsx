import { ChevronDown, LayoutDashboard, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'
import { SidebarNavItem } from './SidebarNavItem'
import type { SidebarItem } from './sidebarConfig'

const IconX = typeof X !== 'undefined' ? X : ChevronDown

interface SidebarRecentPagesProps {
  collapsed: boolean
  sectionLabelKey: string
  open: boolean
  recentNavItems: SidebarItem[]
  onToggleSection: () => void
  onClearRecent: () => void
}

export function SidebarRecentPages({
  collapsed,
  sectionLabelKey,
  open,
  recentNavItems,
  onToggleSection,
  onClearRecent,
}: SidebarRecentPagesProps) {
  const { t } = useTranslation()
  const showItems = collapsed || open

  if (!recentNavItems.length) return null

  return (
    <div className="space-y-1" role="group" aria-label={t(sectionLabelKey)}>
      {!collapsed && (
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={onToggleSection}
          aria-expanded={open}
          aria-controls="nav-section-recent"
        >
          <span>{t(sectionLabelKey)}</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                onClearRecent()
              }}
              className="rounded-md p-1 text-[11px] font-semibold text-muted-foreground hover:bg-muted"
              aria-label={t('nav.clearRecent')}
            >
              <IconX className="h-3 w-3" aria-hidden="true" />
            </button>
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform', !open && '-rotate-90')}
              aria-hidden="true"
            />
          </div>
        </button>
      )}
      {showItems && (
        <ul id="nav-section-recent" role="list" className="space-y-0.5">
          {recentNavItems.map((item) => (
            <li key={item.to}>
              <SidebarNavItem item={item} collapsed={collapsed} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

