import { ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'
import { TooltipProvider } from '@/components/ui/tooltip'

import { SidebarNavItem } from './SidebarNavItem'
import { SidebarRecentPages } from './SidebarRecentPages'
import {
  SECTION_LABELS,
  SECTION_ORDER,
  type NavItem,
  type NavSection,
  type SidebarItem,
} from './sidebarConfig'

interface SidebarNavigationProps {
  collapsed: boolean
  favorites: string[]
  sections: Record<NavSection, NavItem[]>
  favoriteNavItems: SidebarItem[]
  recentNavItems: SidebarItem[]
  isSectionOpen: (key: string) => boolean
  onToggleSection: (key: string) => void
  onToggleFavorite: (path: string) => void
  onClearRecent: () => void
}

export function SidebarNavigation({
  collapsed,
  favorites,
  sections,
  favoriteNavItems,
  recentNavItems,
  isSectionOpen,
  onToggleSection,
  onToggleFavorite,
  onClearRecent,
}: SidebarNavigationProps) {
  const { t } = useTranslation()

  return (
    <TooltipProvider delayDuration={0}>
      <nav className="flex-1 space-y-2 overflow-y-auto p-2 scroll-smooth" aria-label="Main navigation">
        {SECTION_ORDER.map((sectionKey) => {
          if (sectionKey === 'favorites') {
            if (!favoriteNavItems.length) return null
            const sectionLabelKey = SECTION_LABELS[sectionKey]
            const open = isSectionOpen(sectionLabelKey)
            const showItems = collapsed || open

            return (
              <div key="favorites" className="space-y-1" role="group" aria-label={t(sectionLabelKey)}>
                {!collapsed && (
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    onClick={() => onToggleSection(sectionLabelKey)}
                    aria-expanded={open}
                    aria-controls="nav-section-favorites"
                  >
                    <span>{t(sectionLabelKey)}</span>
                    <ChevronDown
                      className={cn('h-3.5 w-3.5 transition-transform', !open && '-rotate-90')}
                      aria-hidden="true"
                    />
                  </button>
                )}
                {showItems && (
                  <ul id="nav-section-favorites" role="list" className="space-y-0.5">
                    {favoriteNavItems.map((item) => (
                      <li key={item.to}>
                        <SidebarNavItem
                          item={item}
                          collapsed={collapsed}
                          isFavorite
                          onToggleFavorite={() => onToggleFavorite(item.to)}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          }

          if (sectionKey === 'recent') {
            const sectionLabelKey = SECTION_LABELS[sectionKey]
            return (
              <SidebarRecentPages
                key="recent"
                collapsed={collapsed}
                sectionLabelKey={sectionLabelKey}
                open={isSectionOpen(sectionLabelKey)}
                recentNavItems={recentNavItems}
                onToggleSection={() => onToggleSection(sectionLabelKey)}
                onClearRecent={onClearRecent}
              />
            )
          }

          const items = sections[sectionKey as NavSection]
          if (!items || items.length === 0) return null
          const sectionLabelKey = SECTION_LABELS[sectionKey]
          const open = isSectionOpen(sectionLabelKey)
          const showItems = collapsed || open

          return (
            <div key={sectionKey} className="space-y-1" role="group" aria-label={t(sectionLabelKey)}>
              {!collapsed && (
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  onClick={() => onToggleSection(sectionLabelKey)}
                  aria-expanded={open}
                  aria-controls={`nav-section-${sectionKey}`}
                >
                  <span>{t(sectionLabelKey)}</span>
                  <ChevronDown
                    className={cn('h-3.5 w-3.5 transition-transform', !open && '-rotate-90')}
                    aria-hidden="true"
                  />
                </button>
              )}
              {showItems && (
                <ul id={`nav-section-${sectionKey}`} role="list" className="space-y-0.5">
                  {items.map((item) => (
                    <li key={item.to}>
                      <SidebarNavItem
                        item={{
                          to: item.to,
                          icon: item.icon,
                          label: t(item.labelKey),
                          shortcut: item.shortcut,
                          badge: item.badge,
                        }}
                        collapsed={collapsed}
                        isFavorite={favorites.includes(item.to)}
                        onToggleFavorite={() => onToggleFavorite(item.to)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </nav>
    </TooltipProvider>
  )
}
