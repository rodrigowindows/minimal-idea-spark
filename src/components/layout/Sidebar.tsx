import { useCallback, useEffect, useMemo, useState } from 'react'
import { Clock3, Globe, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'
import { getStorageItem, setStorageItem } from '@/lib/storage'
import { useAppContext } from '@/contexts/AppContext'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { useRecentPages } from '@/hooks/useRecentPages'
import { NotificationCenter } from '@/components/NotificationCenter'
import { SyncStatusIndicator } from '@/components/SyncStatusIndicator'

import { SidebarFooter } from './SidebarFooter'
import { SidebarNavigation } from './SidebarNavigation'
import { SidebarXPBar } from './SidebarXPBar'
import {
  FLAG_MAP,
  NAV_ITEMS,
  SIDEBAR_FAVORITES_STORAGE_KEY,
  SIDEBAR_SECTIONS_STORAGE_KEY,
  type NavItem,
  type NavSection,
  type SidebarItem,
} from './sidebarConfig'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

function getStoredSections(storageKey: string): Record<string, boolean> {
  return getStorageItem<Record<string, boolean>>(storageKey, {})
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { t } = useTranslation()
  const { deepWorkMode, toggleDeepWorkMode } = useAppContext()
  const { language, toggleLanguage } = useLanguage()
  const { user } = useAuth()

  const navItemsWithBadges = useMemo(() => NAV_ITEMS, [])

  const storageKey = useMemo(
    () => (user?.id ? `${SIDEBAR_SECTIONS_STORAGE_KEY}_${user.id}` : SIDEBAR_SECTIONS_STORAGE_KEY),
    [user?.id],
  )
  const favoritesKey = useMemo(
    () => (user?.id ? `${SIDEBAR_FAVORITES_STORAGE_KEY}_${user.id}` : SIDEBAR_FAVORITES_STORAGE_KEY),
    [user?.id],
  )

  const [sectionsOpen, setSectionsOpen] = useState<Record<string, boolean>>(() =>
    getStoredSections(storageKey),
  )
  const [favorites, setFavorites] = useState<string[]>(() => getStorageItem<string[]>(favoritesKey, []))

  useEffect(() => {
    setSectionsOpen(getStoredSections(storageKey))
  }, [storageKey])

  useEffect(() => {
    setFavorites(getStorageItem<string[]>(favoritesKey, []))
  }, [favoritesKey])

  const toggleSection = useCallback(
    (key: string) => {
      setSectionsOpen((prev) => {
        const next = { ...prev, [key]: !prev[key] }
        setStorageItem(storageKey, next)
        return next
      })
    },
    [storageKey],
  )

  const isSectionOpen = useCallback((key: string) => sectionsOpen[key] !== false, [sectionsOpen])

  const navItemsForRecent = useMemo(
    () => navItemsWithBadges.map(({ to, labelKey }) => ({ to, labelKey })),
    [navItemsWithBadges],
  )

  const { recentPages, clearRecent } = useRecentPages(navItemsForRecent, t, {
    userId: user?.id ?? null,
    max: 5,
  })

  const recentNavItems = useMemo<SidebarItem[]>(
    () =>
      recentPages.map((page) => {
        const match = navItemsWithBadges.find((item) => item.to === page.path)
        return {
          to: page.path,
          icon: match?.icon ?? Clock3,
          label: page.label ?? (match ? t(match.labelKey) : page.path),
          shortcut: match?.shortcut,
          badge: match?.badge,
        }
      }),
    [recentPages, navItemsWithBadges, t],
  )

  const toggleFavorite = useCallback(
    (path: string) => {
      setFavorites((prev) => {
        const exists = prev.includes(path)
        const next = exists ? prev.filter((item) => item !== path) : [path, ...prev].slice(0, 7)
        setStorageItem(favoritesKey, next)
        return next
      })
    },
    [favoritesKey],
  )

  const favoriteNavItems = useMemo<SidebarItem[]>(
    () =>
      favorites
        .map((path) => navItemsWithBadges.find((item) => item.to === path))
        .filter(Boolean)
        .map((item) => ({
          to: item!.to,
          icon: item!.icon,
          label: t(item!.labelKey),
          shortcut: item!.shortcut,
          badge: item!.badge,
        })),
    [favorites, navItemsWithBadges, t],
  )

  const sections = useMemo<Record<NavSection, NavItem[]>>(() => {
    const grouped: Record<NavSection, NavItem[]> = {
      principal: [],
      tools: [],
      config: [],
    }
    navItemsWithBadges.forEach((item) => {
      grouped[item.section].push(item)
    })
    return grouped
  }, [navItemsWithBadges])

  return (
    <aside
      id="main-nav"
      aria-label={collapsed ? 'Canvas - Navigation (collapsed)' : 'Canvas - Navigation'}
      className={cn(
        'flex h-full min-h-screen flex-shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out',
        collapsed ? 'w-[var(--sidebar-width-collapsed)]' : 'w-[var(--sidebar-width-expanded)]',
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-border/50 px-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
          {!collapsed && <span className="text-lg font-semibold tracking-tight">LifeOS</span>}
        </div>
        <div className="flex items-center gap-1">
          <SyncStatusIndicator className="shrink-0" />
          <NotificationCenter />
          <button
            onClick={toggleLanguage}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors',
              'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              collapsed && 'px-1',
            )}
            title={t('common.switchLanguage')}
            aria-label={t('common.switchLanguage')}
          >
            <Globe className="h-4 w-4 shrink-0" />
            {!collapsed && (
              <span className="font-bold uppercase">{FLAG_MAP[language] || '🇧🇷 PT'}</span>
            )}
          </button>
        </div>
      </div>

      <SidebarXPBar collapsed={collapsed} />

      <SidebarNavigation
        collapsed={collapsed}
        favorites={favorites}
        sections={sections}
        favoriteNavItems={favoriteNavItems}
        recentNavItems={recentNavItems}
        isSectionOpen={isSectionOpen}
        onToggleSection={toggleSection}
        onToggleFavorite={toggleFavorite}
        onClearRecent={clearRecent}
      />

      <SidebarFooter
        collapsed={collapsed}
        deepWorkMode={deepWorkMode}
        onToggleDeepWork={toggleDeepWorkMode}
        onToggleSidebar={onToggle}
      />
    </aside>
  )
}
