import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { PageBreadcrumbs } from './PageBreadcrumbs'

/**
 * Reusable page header with breadcrumb, actions, tabs and filter slots.
 * - Variants: `hero` (large title), `compact` (one-line title + actions), `withTabs` (extra breathing room when tabs are present).
 * - Mobile-first: actions stack below the title on small screens and align right on desktop.
 * - Accessibility: heading is focusable for SkipLink and announced via `aria-labelledby`.
 */
export type PageHeaderVariant = 'default' | 'compact' | 'hero' | 'withTabs'

interface PageHeaderProps {
  title: string
  description?: string
  /** Breadcrumb items: [{ label, href? }]. Last item is current page (no href). */
  breadcrumb?: { label: string; href?: string }[]
  /** Actions (buttons, dropdown) on the right */
  actions?: ReactNode
  /** Optional tab list rendered below the heading row */
  tabs?: ReactNode
  /** Slot for search/filter bars or any extra content under the header */
  children?: ReactNode
  /** Visual density */
  variant?: PageHeaderVariant
  /** Custom heading id (useful if multiple headers on same view) */
  headingId?: string
  className?: string
}

export function PageHeader({
  title,
  description,
  breadcrumb,
  actions,
  tabs,
  children,
  variant = 'default',
  headingId = 'page-title',
  className,
}: PageHeaderProps) {
  const headingStyles = {
    hero: 'text-3xl md:text-4xl',
    compact: 'text-xl md:text-2xl',
    withTabs: 'text-2xl md:text-3xl',
    default: 'text-2xl',
  } as const

  const spacingByVariant = {
    hero: 'mb-8',
    compact: 'mb-4',
    withTabs: 'mb-5',
    default: 'mb-6',
  } as const

  return (
    <header
      className={cn(spacingByVariant[variant], className)}
      role="region"
      aria-labelledby={headingId}
    >
      {breadcrumb && breadcrumb.length > 0 && (
        <PageBreadcrumbs items={breadcrumb} className="mb-2" />
      )}

      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <h1
            id={headingId}
            tabIndex={-1}
            className={cn('font-bold tracking-tight text-foreground', headingStyles[variant])}
          >
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>

        {actions && (
          <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">
            {actions}
          </div>
        )}
      </div>

      {tabs && (
        <div className="mt-4 border-b border-border/60 pb-1">
          {tabs}
        </div>
      )}

      {children && (
        <div className={cn('mt-4', tabs && 'md:mt-3')}>
          {children}
        </div>
      )}
    </header>
  )
}
