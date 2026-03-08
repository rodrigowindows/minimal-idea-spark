import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  Bell,
  BookOpen,
  Calendar,
  CheckSquare,
  GitBranch,
  Globe,
  HelpCircle,
  LayoutDashboard,
  Lightbulb,
  ListChecks,
  MessageSquare,
  Moon,
  Send,
  Settings2,
  Target,
  Terminal,
  TrendingUp,
  Star,
} from 'lucide-react'

export type NavSection = 'principal' | 'tools' | 'nightworker' | 'config'
export type SectionKey = NavSection | 'recent' | 'favorites'

export interface NavItem {
  to: string
  icon: LucideIcon
  labelKey: string
  section: NavSection
  shortcut?: string
  badge?: number
}

export interface SidebarItem {
  to: string
  icon: LucideIcon
  label: string
  shortcut?: string
  badge?: number
}

export const FLAG_MAP: Record<string, string> = {
  'pt-BR': '🇧🇷 PT',
  en: '🇺🇸 EN',
  es: '🇪🇸 ES',
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard', section: 'principal', shortcut: 'Alt+1' },
  { to: '/consultant', icon: MessageSquare, labelKey: 'nav.consultant', section: 'principal', shortcut: 'Alt+2' },
  { to: '/opportunities', icon: Lightbulb, labelKey: 'nav.opportunities', section: 'principal' },
  { to: '/journal', icon: BookOpen, labelKey: 'nav.journal', section: 'principal', shortcut: 'Alt+3' },
  { to: '/goals', icon: Target, labelKey: 'nav.goals', section: 'principal' },
  { to: '/habits', icon: CheckSquare, labelKey: 'nav.habits', section: 'principal' },
  { to: '/calendar', icon: Calendar, labelKey: 'nav.calendar', section: 'principal' },
  { to: '/analytics', icon: BarChart3, labelKey: 'nav.analytics', section: 'principal' },
  { to: '/priorities', icon: Star, labelKey: 'nav.priorities', section: 'principal' },
  { to: '/weekly-review', icon: TrendingUp, labelKey: 'nav.weeklyReview', section: 'tools' },
  { to: '/nw', icon: Moon, labelKey: 'nav.nightWorker', section: 'nightworker' },
  { to: '/nw/submit', icon: Send, labelKey: 'nav.nwSubmit', section: 'nightworker' },
  { to: '/nw/prompts', icon: ListChecks, labelKey: 'nav.nwPrompts', section: 'nightworker' },
  { to: '/nw/projects', icon: Globe, labelKey: 'nav.nwProjects', section: 'nightworker' },
  { to: '/nw/templates', icon: GitBranch, labelKey: 'nav.nwPipelines', section: 'nightworker' },
  { to: '/nw/logs', icon: Terminal, labelKey: 'nav.nwLogs', section: 'nightworker' },
  { to: '/notifications', icon: Bell, labelKey: 'nav.notifications', section: 'config' },
  { to: '/settings', icon: Settings2, labelKey: 'nav.settings', section: 'config', shortcut: 'Alt+9' },
  { to: '/help', icon: HelpCircle, labelKey: 'nav.help', section: 'config' },
]

export const SECTION_LABELS: Record<SectionKey, string> = {
  principal: 'nav.sectionPrincipal',
  tools: 'nav.sectionTools',
  nightworker: 'nav.sectionNightWorker',
  config: 'nav.sectionConfig',
  recent: 'nav.sectionRecent',
  favorites: 'nav.sectionFavorites',
}

export const SECTION_ORDER: SectionKey[] = ['favorites', 'recent', 'nightworker', 'principal', 'tools', 'config']

export const SIDEBAR_SECTIONS_STORAGE_KEY = 'lifeos_sidebar_sections'
export const SIDEBAR_FAVORITES_STORAGE_KEY = 'lifeos_sidebar_favorites'

