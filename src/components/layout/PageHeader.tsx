import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { PageBreadcrumbs } from './PageBreadcrumbs'

export type PageHeaderVariant = 'default' | 'compact' | 'hero'

interface PageHeaderProps {
  title: string
  description?: string
  /** Breadcrumb items: [{ label, href? }]. Last item is current page (no href). */
  breadcrumb?: { label: string; href?: string }[]
  /** Actions (buttons, dropdown) on the right */
  actions?: ReactNode
  /** Tabs or extra content below title row */
  children?: ReactNode
  variant?: PageHeaderVariant
  className?: string
}

export function PageHeader({
  title,
  description,
  breadcrumb,
  actions,
  children,
  variant = 'default',
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn('mb-6', className)}
      role="banner"
      aria-label={title}
    >
      {breadcrumb && breadcrumb.length > 0 && (
        <PageBreadcrumbs items={breadcrumb} className="mb-2" />
      )}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <h1
            className={cn(
              'font-bold tracking-tight text-foreground',
              variant === 'hero' && 'text-2xl md:text-3xl',
              variant === 'compact' && 'text-lg',
              variant === 'default' && 'text-2xl'
            )}
            id="page-title"
          >
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </header>
  )
}
