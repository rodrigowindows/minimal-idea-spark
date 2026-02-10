import { useState, useCallback, useMemo } from 'react'
import {
  Bell,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock,
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
  Zap,
  FileStack,
  FileText,
  ImageIcon,
  History,
  HelpCircle,
  Plug,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAppContext } from '@/contexts/AppContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { XPProgressBar } from '@/components/gamification/XPProgressBar'
import { WorkspaceSwitcher } from '@/components/WorkspaceSwitcher'
import { NotificationCenter } from '@/components/NotificationCenter'
import { SyncStatusIndicator } from '@/components/SyncStatusIndicator'
import { useRecentPages } from '@/hooks/useRecentPages'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

const FLAG_MAP: Record<string, string> = {
  'pt-BR': 'PT-BR',
  en: 'EN',
  es: 'ES',
}

const TRANSLATION_FALLBACKS: Record<string, string> = {
  'common.switchLanguage': 'Trocar idioma',
  'nav.dashboard': 'Painel',
  'nav.consultant': 'Consultor',
  'nav.opportunities': 'Oportunidades',
  'nav.journal': 'Diario',
  'nav.habits': 'Habitos',
  'nav.goals': 'Metas',
  'nav.calendar': 'Calendario',
  'nav.priorities': 'Prioridades',
  'nav.analytics': 'Analiticos',
  'nav.weeklyReview': 'Revisao Semanal',
  'nav.notifications': 'Notificacoes',
  'nav.contentGenerator': 'Gerador de Conteudo',
  'nav.automation': 'Automacao',
  'nav.templates': 'Templates',
  'nav.images': 'Imagens',
  'nav.versionHistory': 'Historico',
  'nav.workspace': 'Espaco de Trabalho',
  'nav.import': 'Importar',
  'nav.reports': 'Relatorios',
  'nav.integrations': 'Integracoes',
  'nav.help': 'Ajuda',
  'nav.settings': 'Configuracoes',
  'nav.sectionPrincipal': 'Principal',
  'nav.sectionProdutividade': 'Produtividade',
  'nav.sectionFerramentas': 'Ferramentas',
  'nav.sectionConfig': 'Configuracao',
  'nav.sectionRecent': 'Recentes',
  'nav.deepWork': 'Foco Profundo',
  'nav.expand': 'Expandir',
  'nav.collapse': 'Recolher',
}

const SHORTCUT_MAP: Record<string, string> = {
  '/': 'Alt+1',
  '/consultant': 'Alt+2',
  '/opportunities': 'Alt+3',
  '/journal': 'Alt+4',
  '/habits': 'Alt+5',
  '/goals': 'Alt+6',
  '/calendar': 'Alt+7',
  '/priorities': 'Alt+8',
  '/settings': 'Alt+0',
}

const navItems: { to: string; icon: typeof LayoutDashboard; labelKey: string }[] = [
  { to: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { to: '/consultant', icon: MessageSquare, labelKey: 'nav.consultant' },
  { to: '/opportunities', icon: Target, labelKey: 'nav.opportunities' },
  { to: '/journal', icon: BookOpen, labelKey: 'nav.journal' },
  { to: '/habits', icon: Repeat, labelKey: 'nav.habits' },
  { to: '/goals', icon: Flag, labelKey: 'nav.goals' },
  { to: '/calendar', icon: CalendarDays, labelKey: 'nav.calendar' },
  { to: '/priorities', icon: Crosshair, labelKey: 'nav.priorities' },
  { to: '/analytics', icon: BarChart3, labelKey: 'nav.analytics' },
  { to: '/weekly-review', icon: ClipboardCheck, labelKey: 'nav.weeklyReview' },
  { to: '/notifications', icon: Bell, labelKey: 'nav.notifications' },
  { to: '/content-generator', icon: PenTool, labelKey: 'nav.contentGenerator' },
  { to: '/automation', icon: Zap, labelKey: 'nav.automation' },
  { to: '/templates', icon: FileStack, labelKey: 'nav.templates' },
  { to: '/images', icon: ImageIcon, labelKey: 'nav.images' },
  { to: '/version-history', icon: History, labelKey: 'nav.versionHistory' },
  { to: '/workspace', icon: Building2, labelKey: 'nav.workspace' },
  { to: '/import', icon: FileStack, labelKey: 'nav.import' },
  { to: '/reports', icon: FileText, labelKey: 'nav.reports' },
  { to: '/integrations', icon: Plug, labelKey: 'nav.integrations' },
  { to: '/help', icon: HelpCircle, labelKey: 'nav.help' },
  { to: '/settings', icon: Settings2, labelKey: 'nav.settings' },
]

const SIDEBAR_SECTIONS: { sectionKey: string; paths: string[] }[] = [
  { sectionKey: 'nav.sectionPrincipal', paths: ['/', '/consultant', '/opportunities', '/journal'] },
  { sectionKey: 'nav.sectionProdutividade', paths: ['/habits', '/goals', '/calendar', '/priorities', '/analytics', '/weekly-review', '/reports'] },
  { sectionKey: 'nav.sectionFerramentas', paths: ['/notifications', '/content-generator', '/automation', '/templates', '/images', '/version-history'] },
  { sectionKey: 'nav.sectionConfig', paths: ['/workspace', '/integrations', '/import', '/help', '/settings'] },
]

const STORAGE_KEY = 'lifeos_sidebar_sections'

function getStoredSections(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, boolean>
    return typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { deepWorkMode, toggleDeepWorkMode } = useAppContext()
  const { language, toggleLanguage, t } = useLanguage()
  const [sectionsOpen, setSectionsOpen] = useState<Record<string, boolean>>(getStoredSections)

  const tr = useCallback((key: string): string => {
    const translated = t(key)
    if (translated && translated !== key) return translated
    return TRANSLATION_FALLBACKS[key] ?? key
  }, [t])

  const { recentPages } = useRecentPages(navItems, tr)

  const recentNavItems = useMemo(() => {
    // Skip current page (first item) and return up to 4 recent pages
    return recentPages
      .slice(1, 5)
      .map((rp) => navItems.find((n) => n.to === rp.path))
      .filter(Boolean) as typeof navItems
  }, [recentPages])

  const tooltipLabel = useCallback((item: { to: string; labelKey: string }) => {
    const label = tr(item.labelKey)
    const shortcut = SHORTCUT_MAP[item.to]
    return shortcut ? `${label} (${shortcut})` : label
  }, [tr])

  const toggleSection = useCallback((key: string) => {
    setSectionsOpen((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // ignore storage errors
      }
      return next
    })
  }, [])

  const isSectionOpen = (key: string) => sectionsOpen[key] !== false

  return (
    <aside
      id="main-nav"
      aria-label={collapsed ? 'Canvas - Navigation (collapsed)' : 'Canvas - Navigation'}
      className="flex h-full min-h-screen w-full flex-shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out"
    >
      <div className="flex h-16 items-center justify-between border-b border-border/50 px-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
          {!collapsed && (
            <span className="text-lg font-semibold tracking-tight">Canvas</span>
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
            title={tr('common.switchLanguage')}
            aria-label={tr('common.switchLanguage')}
          >
            <Globe className="h-4 w-4 shrink-0" />
            {!collapsed && (
              <span className="uppercase font-bold">{FLAG_MAP[language] || 'PT-BR'}</span>
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

      <nav className="flex-1 space-y-1 overflow-y-auto p-2" aria-label="Main navigation">
        {/* Recent Pages Section */}
        {recentNavItems.length > 0 && (
          <div className="space-y-0.5" role="group" aria-label={tr('nav.sectionRecent')}>
            {!collapsed ? (
              <>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  onClick={() => toggleSection('nav.sectionRecent')}
                  aria-expanded={isSectionOpen('nav.sectionRecent')}
                  aria-controls="nav-section-nav-sectionRecent"
                >
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    {tr('nav.sectionRecent')}
                  </span>
                  <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', !isSectionOpen('nav.sectionRecent') && '-rotate-90')} aria-hidden="true" />
                </button>
                {isSectionOpen('nav.sectionRecent') && (
                  <ul id="nav-section-nav-sectionRecent" role="list" className="space-y-0.5">
                    {recentNavItems.map((item) => (
                      <li key={`recent-${item.to}`}>
                        <NavLink
                          to={item.to}
                          end={item.to === '/'}
                          className={({ isActive }) =>
                            cn(
                              'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                              'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                              isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-muted-foreground'
                            )
                          }
                        >
                          <item.icon className="h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
                          <span className="truncate">{tr(item.labelKey)}</span>
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <TooltipProvider delayDuration={0}>
                <div className="mb-1 flex justify-center py-1">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground/50" aria-hidden="true" />
                </div>
                {recentNavItems.map((item) => (
                  <Tooltip key={`recent-${item.to}`}>
                    <TooltipTrigger asChild>
                      <NavLink
                        to={item.to}
                        end={item.to === '/'}
                        aria-label={tooltipLabel(item)}
                        className={({ isActive }) =>
                          cn(
                            'flex justify-center rounded-xl px-2 py-2 text-sm transition-colors',
                            'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                            isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-muted-foreground/70'
                          )
                        }
                      >
                        <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      </NavLink>
                    </TooltipTrigger>
                    <TooltipContent side="right">{tooltipLabel(item)}</TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>
            )}
            {!collapsed && <div className="mx-2 border-b border-border/30" />}
          </div>
        )}

        {/* Main Sections */}
        {SIDEBAR_SECTIONS.map((section) => {
          const open = isSectionOpen(section.sectionKey)
          const items = navItems.filter((item) => section.paths.includes(item.to))
          return (
            <div key={section.sectionKey} className="space-y-0.5" role="group" aria-label={tr(section.sectionKey)}>
              {!collapsed ? (
                <>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    onClick={() => toggleSection(section.sectionKey)}
                    aria-expanded={open}
                    aria-controls={`nav-section-${section.sectionKey.replace(/\./g, '-')}`}
                  >
                    <span>{tr(section.sectionKey)}</span>
                    <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', !open && '-rotate-90')} aria-hidden="true" />
                  </button>
                  {open && (
                    <ul id={`nav-section-${section.sectionKey.replace(/\./g, '-')}`} role="list" className="space-y-0.5">
                      {items.map((item) => (
                        <li key={item.to}>
                          <NavLink
                            to={item.to}
                            end={item.to === '/'}
                            aria-current={undefined}
                            className={({ isActive }) =>
                              cn(
                                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                                'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                                isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-muted-foreground'
                              )
                            }
                          >
                            <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                            <span>{tr(item.labelKey)}</span>
                            {SHORTCUT_MAP[item.to] && (
                              <kbd className="ml-auto text-[10px] text-muted-foreground/50 font-mono">{SHORTCUT_MAP[item.to]}</kbd>
                            )}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <TooltipProvider delayDuration={0}>
                  {items.map((item) => (
                    <Tooltip key={item.to}>
                      <TooltipTrigger asChild>
                        <NavLink
                          to={item.to}
                          end={item.to === '/'}
                          aria-label={tooltipLabel(item)}
                          className={({ isActive }) =>
                            cn(
                              'flex justify-center rounded-xl px-2 py-2.5 text-sm transition-colors',
                              'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                              isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-muted-foreground'
                            )
                          }
                        >
                          <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                        </NavLink>
                      </TooltipTrigger>
                      <TooltipContent side="right">{tooltipLabel(item)}</TooltipContent>
                    </Tooltip>
                  ))}
                </TooltipProvider>
              )}
            </div>
          )
        })}
      </nav>

      <div className="space-y-1 border-t border-border/50 p-2">
        <button
          onClick={toggleDeepWorkMode}
          aria-label={tr('nav.deepWork')}
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
          {!collapsed && <span>{tr('nav.deepWork')}</span>}
        </button>

        <button
          onClick={onToggle}
          aria-label={collapsed ? tr('nav.expand') : tr('nav.collapse')}
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
              <span>{tr('nav.collapse')}</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
