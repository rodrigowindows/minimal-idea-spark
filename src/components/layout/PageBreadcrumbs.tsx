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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Build breadcrumb from current pathname. Path segments map to i18n keys breadcrumbs.<segment> or fallback to segment. */
export function useBreadcrumbFromPath(): BreadcrumbItem[] {
  const { pathname } = useLocation()
  const { t } = useTranslation()

  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) return [{ label: t('nav.dashboard'), href: '/' }]

  const items: BreadcrumbItem[] = [{ label: t('nav.dashboard'), href: '/' }]
  let acc = ''
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    acc += `/${seg}`
    const isLast = i === segments.length - 1

    // Skip UUID params in breadcrumb display but keep them in the path
    if (UUID_RE.test(seg)) continue

    // Format date params nicely
    if (DATE_RE.test(seg)) {
      items.push({ label: seg, href: isLast ? undefined : acc })
      continue
    }

    const key = `breadcrumbs.${seg}`
    const label = t(key) !== key ? t(key) : seg.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    items.push({ label, href: isLast ? undefined : acc })
  }
  return items
}
