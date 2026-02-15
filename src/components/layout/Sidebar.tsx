import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Focus,
  Globe,
  LayoutDashboard,
  Send,
  Settings2,
  Sparkles,
  Star,
  Terminal,
  ListChecks,
  BarChart3,
  X,
  MessageSquare,
  Lightbulb,
  BookOpen,
  Target,
  Calendar,
  CheckSquare,
  TrendingUp,
  Wand2,
  Zap,
  FileText,
  GitBranch,
  Image,
  History,
  Bell,
  HelpCircle,
  Upload,
  FileBarChart,
  Puzzle,
  Users,
  Moon,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useAppContext } from '@/contexts/AppContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { XPProgressBar } from '@/components/gamification/XPProgressBar'
import { WorkspaceSwitcher } from '@/components/WorkspaceSwitcher'
import { NotificationCenter } from '@/components/NotificationCenter'
import { SyncStatusIndicator } from '@/components/SyncStatusIndicator'
import { useRecentPages } from '@/hooks/useRecentPages'
import { usePromptsQuery } from '@/hooks/useNightWorkerApi'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// Fallbacks para evitar ReferenceError se o build não resolver os ícones (ex.: deploy cache antigo)
const IconSparkles = typeof Sparkles !== 'undefined' ? Sparkles : LayoutDashboard
const IconStar = typeof Star !== 'undefined' ? Star : LayoutDashboard
const IconX = typeof X !== 'undefined' ? X : ChevronDown

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

type NavSection = 'principal' | 'tools' | 'nightworker' | 'config'

interface NavItem {
  to: string
  icon: typeof LayoutDashboard
  labelKey: string
  section: NavSection
  shortcut?: string
  badge?: number
}

const FLAG_MAP: Record<string, string> = {
  'pt-BR': '🇧🇷 PT',
  en: '🇺🇸 EN',
  es: '🇪🇸 ES',
}

const NAV_ITEMS: NavItem[] = [
  // Main features
  { to: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard', section: 'principal', shortcut: 'Alt+1' },
  { to: '/consultant', icon: MessageSquare, labelKey: 'nav.consultant', section: 'principal', shortcut: 'Alt+2' },
  { to: '/opportunities', icon: Lightbulb, labelKey: 'nav.opportunities', section: 'principal' },
  { to: '/journal', icon: BookOpen, labelKey: 'nav.journal', section: 'principal', shortcut: 'Alt+3' },
  { to: '/goals', icon: Target, labelKey: 'nav.goals', section: 'principal' },
  { to: '/habits', icon: CheckSquare, labelKey: 'nav.habits', section: 'principal' },
  { to: '/calendar', icon: Calendar, labelKey: 'nav.calendar', section: 'principal' },
  { to: '/analytics', icon: BarChart3, labelKey: 'nav.analytics', section: 'principal' },
  { to: '/priorities', icon: Star, labelKey: 'nav.priorities', section: 'principal' },

  // Productivity tools
  { to: '/weekly-review', icon: TrendingUp, labelKey: 'nav.weeklyReview', section: 'tools' },
  { to: '/content-generator', icon: Wand2, labelKey: 'nav.contentGenerator', section: 'tools' },
  { to: '/automation', icon: Zap, labelKey: 'nav.automation', section: 'tools' },
  { to: '/templates', icon: FileText, labelKey: 'nav.templates', section: 'tools' },
  { to: '/images', icon: Image, labelKey: 'nav.images', section: 'tools' },

  // Night Worker
  { to: '/nw', icon: Moon, labelKey: 'nav.nightWorker', section: 'nightworker' },
  { to: '/nw/submit', icon: Send, labelKey: 'nav.nwSubmit', section: 'nightworker' },
  { to: '/nw/prompts', icon: ListChecks, labelKey: 'nav.nwPrompts', section: 'nightworker' },
  { to: '/nw/templates', icon: GitBranch, labelKey: 'nav.nwPipelines', section: 'nightworker' },
  { to: '/nw/logs', icon: Terminal, labelKey: 'nav.nwLogs', section: 'nightworker' },

  // Config & utilities
  { to: '/version-history', icon: History, labelKey: 'nav.versionHistory', section: 'config' },
  { to: '/notifications', icon: Bell, labelKey: 'nav.notifications', section: 'config' },
  { to: '/settings', icon: Settings2, labelKey: 'nav.settings', section: 'config', shortcut: 'Alt+9' },
  { to: '/help', icon: HelpCircle, labelKey: 'nav.help', section: 'config' },
  { to: '/import', icon: Upload, labelKey: 'nav.import', section: 'config' },
  { to: '/reports', icon: FileBarChart, labelKey: 'nav.reports', section: 'config' },
  { to: '/integrations', icon: Puzzle, labelKey: 'nav.integrations', section: 'config' },
  { to: '/workspace', icon: Users, labelKey: 'nav.workspace', section: 'config' },
]

type SectionKey = NavSection | 'recent' | 'favorites'

const SECTION_LABELS: Record<SectionKey, string> = {
  principal: 'nav.sectionPrincipal',
  tools: 'nav.sectionTools',
  nightworker: 'nav.sectionNightWorker',
  config: 'nav.sectionConfig',
  recent: 'nav.sectionRecent',
  favorites: 'nav.sectionFavorites',
}

const SECTION_ORDER: SectionKey[] = ['favorites', 'recent', 'nightworker', 'principal', 'tools', 'config']

const STORAGE_KEY_BASE = 'lifeos_sidebar_sections'
const FAVORITES_KEY_BASE = 'lifeos_sidebar_favorites'

function getStoredSections(key: string): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, boolean>
    return typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

interface SidebarNavItemProps {
  item: {
    to: string
    icon: typeof LayoutDashboard
    label: string
    shortcut?: string
    badge?: number
  }
  collapsed: boolean
  isFavorite?: boolean
  onToggleFavorite?: () => void
}

function SidebarNavItem({ item, collapsed, isFavorite, onToggleFavorite }: SidebarNavItemProps) {
  const { t } = useTranslation()

  const favoriteButton =
    onToggleFavorite && !collapsed ? (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onToggleFavorite()
        }}
        aria-pressed={!!isFavorite}
        aria-label={isFavorite ? t('nav.removeFavorite') : t('nav.addFavorite')}
        className="ml-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <IconStar
          className={cn('h-4 w-4', isFavorite && 'fill-current text-amber-400')}
          aria-hidden="true"
        />
      </button>
    ) : null

  const content = (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      aria-label={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          'flex w-full flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
          'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-muted-foreground',
          collapsed && 'justify-center px-2'
        )
      }
    >
      <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      {!collapsed && (
        <span className="truncate flex-1">{item.label}</span>
      )}
      {!collapsed && item.badge !== undefined && item.badge > 0 && (
        <span className="ml-auto rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
          {item.badge}
        </span>
      )}
    </NavLink>
  )

  if (!collapsed) {
    return (
      <div className="group flex items-center gap-2">
        {content}
        {favoriteButton && (
          <div className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            {favoriteButton}
          </div>
        )}
      </div>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="relative">
          {content}
          {item.badge !== undefined && item.badge > 0 && (
            <span className="absolute -right-1 -top-1 rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-black">
              {item.badge}
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="right">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span>{item.label}</span>
            {item.shortcut && (
              <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {item.shortcut}
              </kbd>
            )}
          </div>
          {onToggleFavorite && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onToggleFavorite()
              }}
              aria-pressed={!!isFavorite}
              aria-label={isFavorite ? t('nav.removeFavorite') : t('nav.addFavorite')}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted"
            >
              <IconStar className={cn('h-4 w-4', isFavorite && 'fill-current text-amber-400')} aria-hidden="true" />
            </button>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { deepWorkMode, toggleDeepWorkMode } = useAppContext()
  const { t } = useTranslation()
  const { language, toggleLanguage } = useLanguage()
  const { user } = useAuth()
  const [promptsSubmenuOpen, setPromptsSubmenuOpen] = useState(false)
  const shouldLoadPromptData = promptsSubmenuOpen
  const { data: promptData } = usePromptsQuery(30000, {
    enabled: shouldLoadPromptData,
    refetchOnMount: false,
  })
  const pendingCount = promptData?.filter((p) => p.status === 'pending').length ?? 0
  const navItemsWithBadges = useMemo(
    () =>
      NAV_ITEMS.map((item) =>
        item.to === '/nw/prompts' ? { ...item, badge: pendingCount } : item
      ),
    [pendingCount]
  )

  const storageKey = useMemo(
    () => (user?.id ? `${STORAGE_KEY_BASE}_${user.id}` : STORAGE_KEY_BASE),
    [user?.id]
  )
  const favoritesKey = useMemo(
    () => (user?.id ? `${FAVORITES_KEY_BASE}_${user.id}` : FAVORITES_KEY_BASE),
    [user?.id]
  )

  const [sectionsOpen, setSectionsOpen] = useState<Record<string, boolean>>(() => getStoredSections(storageKey))
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(favoritesKey)
      if (!raw) return []
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    setSectionsOpen(getStoredSections(storageKey))
  }, [storageKey])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(favoritesKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          setFavorites(parsed)
        }
      } else {
        setFavorites([])
      }
    } catch {
      setFavorites([])
    }
  }, [favoritesKey])

  const toggleSection = useCallback(
    (key: string) => {
      setSectionsOpen((prev) => {
        const next = { ...prev, [key]: !prev[key] }
        try {
          localStorage.setItem(storageKey, JSON.stringify(next))
        } catch {
          // ignore storage errors
        }
        return next
      })
    },
    [storageKey]
  )

  const isSectionOpen = useCallback(
    (key: string) => sectionsOpen[key] !== false,
    [sectionsOpen]
  )

  const navItemsForRecent = useMemo(
    () => navItemsWithBadges.map(({ to, labelKey }) => ({ to, labelKey })),
    [navItemsWithBadges]
  )

  const { recentPages, clearRecent } = useRecentPages(navItemsForRecent, t, { userId: user?.id ?? null, max: 5 })

  const recentNavItems = useMemo(
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
    [recentPages, navItemsWithBadges, t]
  )

  const toggleFavorite = useCallback(
    (path: string) => {
      setFavorites((prev) => {
        const exists = prev.includes(path)
        const next = exists ? prev.filter((p) => p !== path) : [path, ...prev].slice(0, 7)
        try {
          localStorage.setItem(favoritesKey, JSON.stringify(next))
        } catch {
          /* ignore storage errors */
        }
        return next
      })
    },
    [favoritesKey]
  )

  const favoriteNavItems = useMemo(() => {
    return favorites
      .map((path) => navItemsWithBadges.find((item) => item.to === path))
      .filter(Boolean)
      .map((item) => ({
        to: item!.to,
        icon: item!.icon,
        label: t(item!.labelKey),
        shortcut: item!.shortcut,
        badge: item!.badge,
      }))
  }, [favorites, navItemsWithBadges, t])

  const sections = useMemo(() => {
    const grouped: Record<NavSection, NavItem[]> = {
      principal: [],
      tools: [],
      nightworker: [],
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
        collapsed ? 'w-[var(--sidebar-width-collapsed)]' : 'w-[var(--sidebar-width-expanded)]'
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-border/50 px-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
          {!collapsed && (
            <span className="text-lg font-semibold tracking-tight">Night Worker</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <SyncStatusIndicator className="shrink-0" />
          <NotificationCenter />
          <button
            onClick={toggleLanguage}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors',
              'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-muted-foreground',
              collapsed && 'px-1'
            )}
            title={t('common.switchLanguage')}
            aria-label={t('common.switchLanguage')}
          >
            <Globe className="h-4 w-4 shrink-0" />
            {!collapsed && (
              <span className="uppercase font-bold">{FLAG_MAP[language] || '🇧🇷 PT'}</span>
            )}
          </button>
        </div>
      </div>

      <div className={cn('border-b border-border/50 px-2 py-2', collapsed && 'px-1')}>
        <WorkspaceSwitcher collapsed={collapsed} />
      </div>

      <div className={cn('px-2 py-3', collapsed && 'px-1')}>
        <XPProgressBar compact={collapsed} />
      </div>

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
                      onClick={() => toggleSection(sectionLabelKey)}
                      aria-expanded={open}
                      aria-controls="nav-section-favorites"
                    >
                      <span>{t(sectionLabelKey)}</span>
                      <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', !open && '-rotate-90')} aria-hidden="true" />
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
                            onToggleFavorite={() => toggleFavorite(item.to)}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            }

            if (sectionKey === 'recent') {
              if (!recentNavItems.length) return null
              const sectionLabelKey = SECTION_LABELS[sectionKey]
              const open = isSectionOpen(sectionLabelKey)
              const showItems = collapsed || open

              return (
                <div key="recent" className="space-y-1" role="group" aria-label={t(sectionLabelKey)}>
                  {!collapsed && (
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      onClick={() => toggleSection(sectionLabelKey)}
                      aria-expanded={open}
                      aria-controls="nav-section-recent"
                    >
                      <span>{t(sectionLabelKey)}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            clearRecent()
                          }}
                          className="rounded-md p-1 text-[11px] font-semibold text-muted-foreground hover:bg-muted"
                          aria-label={t('nav.clearRecent')}
                        >
                          <IconX className="h-3 w-3" aria-hidden="true" />
                        </button>
                        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', !open && '-rotate-90')} aria-hidden="true" />
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

            const items = sections[sectionKey as NavSection]
            const sectionLabelKey = SECTION_LABELS[sectionKey]
            const open = isSectionOpen(sectionLabelKey)
            const showItems = collapsed || open

            return (
              <div key={sectionKey} className="space-y-1" role="group" aria-label={t(sectionLabelKey)}>
                {!collapsed && (
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    onClick={() => toggleSection(sectionLabelKey)}
                    aria-expanded={open}
                    aria-controls={`nav-section-${sectionKey}`}
                  >
                    <span>{t(sectionLabelKey)}</span>
                    <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', !open && '-rotate-90')} aria-hidden="true" />
                  </button>
                )}
                {showItems && (
                  <ul id={`nav-section-${sectionKey}`} role="list" className="space-y-0.5">
                    {items.map((item) => {
                      // Special handling for Prompts submenu
                      if (item.to === '/nw/prompts' && !collapsed) {
                        return (
                          <li key={item.to} className="space-y-0.5">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setPromptsSubmenuOpen(true)}
                                className="flex-1 text-left"
                              >
                                <SidebarNavItem
                                  item={{ to: item.to, icon: item.icon, label: t(item.labelKey), shortcut: item.shortcut, badge: item.badge }}
                                  collapsed={false}
                                  isFavorite={favorites.includes(item.to)}
                                  onToggleFavorite={() => toggleFavorite(item.to)}
                                />
                              </button>
                              <button
                                onClick={() => setPromptsSubmenuOpen(!promptsSubmenuOpen)}
                                className="p-2 hover:bg-sidebar-accent rounded-md transition-colors"
                                aria-expanded={promptsSubmenuOpen}
                              >
                                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform text-muted-foreground', !promptsSubmenuOpen && '-rotate-90')} />
                              </button>
                            </div>

                            {promptsSubmenuOpen && promptData && promptData.length > 0 && (
                              <ul className="ml-6 mt-1 space-y-0.5 border-l-2 border-border/50 pl-2">
                                {promptData.slice(0, 10).map((prompt) => (
                                  <li key={prompt.id}>
                                    <NavLink
                                      to={`/nw/prompts/${prompt.id}`}
                                      className={({ isActive }) =>
                                        cn(
                                          'flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors',
                                          'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                                          isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-muted-foreground'
                                        )
                                      }
                                    >
                                      <span className={cn(
                                        'h-1.5 w-1.5 rounded-full shrink-0',
                                        prompt.status === 'pending' ? 'bg-amber-400' :
                                        prompt.status === 'done' ? 'bg-green-400' :
                                        prompt.status === 'failed' ? 'bg-red-400' :
                                        'bg-blue-400'
                                      )} />
                                      <span className="truncate">{prompt.name || `Prompt #${prompt.id.slice(0, 8)}`}</span>
                                    </NavLink>
                                  </li>
                                ))}
                                {promptData.length > 10 && (
                                  <li>
                                    <NavLink
                                      to="/nw/prompts"
                                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors italic"
                                    >
                                      +{promptData.length - 10} more...
                                    </NavLink>
                                  </li>
                                )}
                              </ul>
                            )}
                          </li>
                        )
                      }

                      return (
                        <li key={item.to}>
                          <SidebarNavItem
                            item={{ to: item.to, icon: item.icon, label: t(item.labelKey), shortcut: item.shortcut, badge: item.badge }}
                            collapsed={collapsed}
                            isFavorite={favorites.includes(item.to)}
                            onToggleFavorite={() => toggleFavorite(item.to)}
                          />
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )
          })}
        </nav>
      </TooltipProvider>

      <div className="space-y-1 border-t border-border/50 p-2">
        <button
          onClick={toggleDeepWorkMode}
          aria-label={t('nav.deepWork')}
          aria-pressed={deepWorkMode}
          className={cn(
            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
            'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            deepWorkMode
              ? 'bg-primary/20 text-primary'
              : 'text-muted-foreground',
            collapsed && 'justify-center px-2'
          )}
        >
          <Focus className="h-5 w-5 shrink-0" aria-hidden="true" />
          {!collapsed && <span>{t('nav.deepWork')}</span>}
        </button>

        <button
          onClick={onToggle}
          aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
          aria-expanded={!collapsed}
          className={cn(
            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors',
            'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            collapsed && 'justify-center px-2'
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
    </aside>
  )
}
