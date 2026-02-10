import { useTranslation } from 'react-i18next'
import { SearchX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SearchEmptyStateProps {
  query: string
  onClearFilters?: () => void
  className?: string
}

/**
 * Empty state for search/filter with no results.
 * Use this when a user's search or filter yields zero items.
 * For empty data (no items at all), use <EmptyState /> instead.
 */
export function SearchEmptyState({ query, onClearFilters, className }: SearchEmptyStateProps) {
  const { t } = useTranslation()

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <SearchX className="mb-4 h-12 w-12 text-muted-foreground" aria-hidden />
      <h3 className="text-lg font-semibold text-foreground">
        {t('emptyStates.searchNoResults', { query })}
      </h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {t('emptyStates.searchSuggestion')}
      </p>
      {onClearFilters && (
        <Button className="mt-4" onClick={onClearFilters} variant="outline">
          {t('emptyStates.clearFilters')}
        </Button>
      )}
    </div>
  )
}
