import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Keyboard, Search } from 'lucide-react'
import { useShortcutContext, getEffectiveKeys } from '@/contexts/ShortcutContext'
import type { ShortcutDefinition } from '@/contexts/ShortcutContext'

const CATEGORY_LABELS: Record<string, string> = {
  navigation: 'Navegacao',
  global: 'Global',
  page: 'Pagina',
  modal: 'Modal / Dialog',
}

const CATEGORY_ORDER = ['global', 'navigation', 'page', 'modal']

export function KeyboardShortcutsHelp() {
  const { t } = useTranslation()
  const { shortcuts, customBindings, helpOpen, setHelpOpen } = useShortcutContext()
  const [search, setSearch] = useState('')

  const grouped = useMemo(() => {
    const lower = search.toLowerCase()
    const filtered = shortcuts.filter(s =>
      !lower || s.description.toLowerCase().includes(lower) ||
      getEffectiveKeys(s, customBindings).join('+').toLowerCase().includes(lower)
    )

    const groups: Record<string, ShortcutDefinition[]> = {}
    for (const s of filtered) {
      const cat = s.category
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(s)
    }

    return CATEGORY_ORDER
      .filter(cat => groups[cat]?.length)
      .map(cat => ({ category: cat, label: CATEGORY_LABELS[cat] || cat, items: groups[cat] }))
  }, [shortcuts, search, customBindings])

  return (
    <Dialog open={helpOpen} onOpenChange={(open) => { setHelpOpen(open); if (!open) setSearch('') }}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            {t('shortcuts.title', 'Atalhos de Teclado')}
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('shortcuts.search', 'Buscar atalho...')}
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {grouped.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t('shortcuts.noResults', 'Nenhum atalho encontrado.')}
            </p>
          )}
          {grouped.map(({ category, label, items }) => (
            <div key={category}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {label}
              </h3>
              <div className="space-y-1">
                {items.map((s) => {
                  const keys = getEffectiveKeys(s, customBindings)
                  const isCustom = !!customBindings[s.id]
                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-sm text-foreground">{s.description}</span>
                      <div className="flex items-center gap-1">
                        {isCustom && (
                          <span className="text-[10px] text-primary mr-1">custom</span>
                        )}
                        {keys.map((key) => (
                          <kbd
                            key={key}
                            className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-xs"
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-muted-foreground text-center pt-2 border-t border-border/50">
          {t('shortcuts.hint', 'Pressione ? para abrir/fechar esta janela')}
        </p>
      </DialogContent>
    </Dialog>
  )
}
