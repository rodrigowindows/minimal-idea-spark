import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Opportunity } from '@/types'
import type { KeyResult } from '@/hooks/useLocalData'
import { Search, Link2 } from 'lucide-react'

interface LinkOpportunityModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  opportunities: Opportunity[]
  keyResult: KeyResult
  onLink: (opportunityId: string) => void
  onUnlink: (opportunityId: string) => void
}

export function LinkOpportunityModal({
  open,
  onOpenChange,
  opportunities,
  keyResult,
  onLink,
  onUnlink,
}: LinkOpportunityModalProps) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return opportunities
    const q = search.toLowerCase()
    return opportunities.filter(o =>
      o.title.toLowerCase().includes(q) ||
      (o.description?.toLowerCase().includes(q))
    )
  }, [opportunities, search])

  const linkedSet = new Set(keyResult.linked_opportunity_ids)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            {t('goals.linkOpportunities')}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-2">
          KR: <span className="font-medium text-foreground">{keyResult.title}</span>
        </p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('goals.searchOpportunities')}
            className="pl-9"
          />
        </div>
        <ScrollArea className="max-h-[300px] pr-2">
          <div className="space-y-1">
            {filtered.map(opp => {
              const isLinked = linkedSet.has(opp.id)
              return (
                <label
                  key={opp.id}
                  className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50 cursor-pointer"
                >
                  <Checkbox
                    checked={isLinked}
                    onCheckedChange={() => {
                      if (isLinked) {
                        onUnlink(opp.id)
                      } else {
                        onLink(opp.id)
                      }
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium truncate block">{opp.title}</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {opp.status}
                      </Badge>
                      {opp.domain && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0" style={{ borderColor: opp.domain.color_theme, color: opp.domain.color_theme }}>
                          {opp.domain.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                </label>
              )
            })}
            {filtered.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">
                {t('goals.noOpportunitiesFound')}
              </p>
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>{t('common.done')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
