import { Link, useLocation } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface PageBreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
}

/** Renders breadcrumb trail. Last item is current page (no link). */
export function PageBreadcrumbs({ items, className }: PageBreadcrumbsProps) {
  if (!items.length) return null

  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-1 text-sm text-muted-foreground', className)}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />}
            {item.href && !isLast ? (
              <Link to={item.href} className="hover:text-foreground transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? 'font-medium text-foreground' : undefined}>
                {item.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}

/** Build breadcrumb from current pathname. Path segments map to i18n keys breadcrumbs.pathKey or fallback to segment. */
export function useBreadcrumbFromPath(): BreadcrumbItem[] {
  const { pathname } = useLocation()
  const { t } = useTranslation()

  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) return [{ label: t('nav.dashboard'), href: '/' }]

  const items: BreadcrumbItem[] = [{ label: t('nav.dashboard'), href: '/' }]
  let acc = ''
  for (let i = 0; i < segments.length; i++) {
    acc += `/${segments[i]}`
    const key = `breadcrumbs.${segments[i]}`
    const label = t(key) !== key ? t(key) : segments[i]
    items.push({ label, href: i === segments.length - 1 ? undefined : acc })
  }
  return items
}
