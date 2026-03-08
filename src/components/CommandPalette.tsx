import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, Target, BookOpen, MessageSquare, Focus, Settings2, LayoutDashboard, FileText } from 'lucide-react'
import { useAppContext } from '@/contexts/AppContext'
import { useSearch } from '@/hooks/useSearch'
import { useRecentPages } from '@/hooks/useRecentPages'
import type { SearchResult } from '@/lib/search/semantic-search'
import { cn } from '@/lib/utils'

const NAV_ITEMS: { to: string; labelKey: string; icon: typeof LayoutDashboard }[] = [
  { to: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/consultant', labelKey: 'nav.consultant', icon: MessageSquare },
  { to: '/opportunities', labelKey: 'nav.opportunities', icon: Target },
  { to: '/journal', labelKey: 'nav.journal', icon: BookOpen },
  { to: '/analytics', labelKey: 'nav.analytics', icon: LayoutDashboard },
  { to: '/habits', labelKey: 'nav.habits', icon: FileText },
  { to: '/goals', labelKey: 'nav.goals', icon: Target },
  { to: '/calendar', labelKey: 'nav.calendar', icon: FileText },
  
  { to: '/weekly-review', labelKey: 'nav.weeklyReview', icon: FileText },
  { to: '/notifications', labelKey: 'nav.notifications', icon: FileText },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings2 },
]

function resultHref(r: SearchResult): string | null {
  if (r.type === 'opportunity' && r.id) return `/opportunities/${r.id}`
  if (r.type === 'journal' && r.id) return `/journal?date=${r.metadata?.log_date || ''}`
  if (r.type === 'goal' && r.id) return `/goals`
  if (r.type === 'habit' && r.id) return `/habits`
  return null
}

export function CommandPalette() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { commandPaletteOpen, setCommandPaletteOpen, toggleDeepWorkMode } = useAppContext()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const { query, setQuery, results } = useSearch({
    debounceMs: 200,
    minQueryLength: 1,
  })
  const navItemsForRecent = useMemo(
    () => NAV_ITEMS.map(({ to, labelKey }) => ({ to, labelKey })),
    []
  )
  const { recentPages } = useRecentPages(navItemsForRecent, t)

  const quickActions = [
    { id: 'new-opportunity', label: t('commandPalette.newOpportunity'), icon: Target, path: '/opportunities', trigger: 'new' },
    { id: 'new-journal', label: t('commandPalette.newJournalEntry'), icon: BookOpen, path: '/journal', trigger: 'new' },
    { id: 'consultant', label: t('commandPalette.openConsultant'), icon: MessageSquare, path: '/consultant' },
    { id: 'deep-work', label: t('commandPalette.deepWork'), icon: Focus, action: () => toggleDeepWorkMode() },
    { id: 'settings', label: t('commandPalette.openSettings'), icon: Settings2, path: '/settings' },
  ]

  const filteredPages = !query.trim()
    ? NAV_ITEMS
    : NAV_ITEMS.filter((item) =>
        t(item.labelKey).toLowerCase().includes(query.toLowerCase())
      )

  const searchResultsWithHref = results
    .map((r) => ({ ...r, href: resultHref(r) }))
    .filter((r) => r.href !== null) as (SearchResult & { href: string })[]

  const totalItems =
    quickActions.length +
    (query.length >= 1 ? searchResultsWithHref.length : 0) +
    (query.length >= 1 ? 0 : Math.min(recentPages.length, 5)) +
    filteredPages.length

  const close = useCallback(() => {
    setCommandPaletteOpen(false)
    setQuery('')
    setSelectedIndex(0)
  }, [setCommandPaletteOpen, setQuery])

  useEffect(() => {
    if (commandPaletteOpen) {
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [commandPaletteOpen])

  // Store mutable refs to avoid re-creating the keydown handler on every render
  const stateRef = useRef({ selectedIndex, totalItems, quickActions, searchResultsWithHref, recentPages, filteredPages, query })
  stateRef.current = { selectedIndex, totalItems, quickActions, searchResultsWithHref, recentPages, filteredPages, query }

  useEffect(() => {
    if (!commandPaletteOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      const s = stateRef.current
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => (i + 1) % Math.max(1, s.totalItems))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => (i - 1 + s.totalItems) % Math.max(1, s.totalItems))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        let idx = 0
        for (const a of s.quickActions) {
          if (idx === s.selectedIndex) {
            if (a.action) a.action()
            else if (a.path) {
              navigate(a.path)
              if (a.trigger === 'new') {
                setTimeout(() => {
                  const ev = new CustomEvent('command-palette-new', { detail: a.trigger })
                  window.dispatchEvent(ev)
                }, 100)
              }
            }
            close()
            return
          }
          idx++
        }
        if (s.query.length >= 1) {
          for (const r of s.searchResultsWithHref) {
            if (idx === s.selectedIndex) {
              navigate(r.href)
              close()
              return
            }
            idx++
          }
        }
        if (s.query.length < 1) {
          for (const p of s.recentPages.slice(0, 5)) {
            if (idx === s.selectedIndex) {
              navigate(p.path)
              close()
              return
            }
            idx++
          }
        }
        for (const p of s.filteredPages) {
          if (idx === s.selectedIndex) {
            navigate(p.to)
            close()
            return
          }
          idx++
        }
      } else if (e.key === 'Escape') {
        close()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [commandPaletteOpen, navigate, close])

  if (!commandPaletteOpen) return null

  return (
    <Dialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <DialogContent
        className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-lg"
        onPointerDownOutside={close}
        onEscapeKeyDown={close}
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">{t('commandPalette.placeholder')}</DialogTitle>
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('commandPalette.placeholder')}
            className="border-0 bg-transparent shadow-none focus-visible:ring-0"
            aria-label={t('commandPalette.placeholder')}
          />
        </div>
        <ScrollArea className="max-h-[60vh] overflow-y-auto">
          <div className="py-2">
            {query.length >= 1 && (
              <>
                <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
                  {t('commandPalette.quickActions')}
                </div>
                {quickActions.map((action, i) => (
                  <button
                    key={action.id}
                    type="button"
                    className={cn(
                      'flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
                      selectedIndex === i ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                    )}
                    onClick={() => {
                      if (action.action) action.action()
                      else if (action.path) navigate(action.path)
                      close()
                    }}
                  >
                    <action.icon className="h-4 w-4 shrink-0" />
                    {action.label}
                  </button>
                ))}
                {searchResultsWithHref.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
                      {t('commandPalette.searchResults')}
                    </div>
                    {searchResultsWithHref.map((r, i) => {
                      const idx = quickActions.length + i
                      return (
                        <button
                          key={r.id}
                          type="button"
                          className={cn(
                            'flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
                            selectedIndex === idx ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                          )}
                          onClick={() => {
                            navigate(r.href)
                            close()
                          }}
                        >
                          <span className="text-muted-foreground">{r.type}</span>
                          <span className="truncate">{r.title}</span>
                        </button>
                      )
                    })}
                  </>
                )}
              </>
            )}
            {query.length < 1 && (
              <>
                <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
                  {t('commandPalette.recent')}
                </div>
                {recentPages.slice(0, 5).map((p, i) => (
                  <button
                    key={p.path + p.timestamp}
                    type="button"
                    className={cn(
                      'flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
                      selectedIndex === i ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                    )}
                    onClick={() => {
                      navigate(p.path)
                      close()
                    }}
                  >
                    {p.labelKey ? t(p.labelKey) : (p.label || p.path)}
                  </button>
                ))}
                <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
                  {t('commandPalette.quickActions')}
                </div>
                {quickActions.map((action, i) => {
                  const idx = Math.min(5, recentPages.length) + i
                  return (
                    <button
                      key={action.id}
                      type="button"
                      className={cn(
                        'flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
                        selectedIndex === idx ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                      )}
                      onClick={() => {
                        if (action.action) action.action()
                        else if (action.path) navigate(action.path)
                        close()
                      }}
                    >
                      <action.icon className="h-4 w-4 shrink-0" />
                      {action.label}
                    </button>
                  )
                })}
              </>
            )}
            <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
              {t('commandPalette.pages')}
            </div>
            {filteredPages.map((p, i) => {
              const baseIdx =
                query.length >= 1
                  ? quickActions.length + searchResultsWithHref.length
                  : Math.min(5, recentPages.length) + quickActions.length
              const idx = baseIdx + i
              return (
                <button
                  key={p.to}
                  type="button"
                  className={cn(
                    'flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
                    selectedIndex === idx ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                  )}
                  onClick={() => {
                    navigate(p.to)
                    close()
                  }}
                >
                  <p.icon className="h-4 w-4 shrink-0" />
                  {t(p.labelKey)}
                </button>
              )
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
