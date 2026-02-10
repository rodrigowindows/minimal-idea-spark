import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageContentProps {
  children: ReactNode
  /**
   * Use 'narrow' for reading-heavy pages (journal/knowledge), 'wide' for dense dashboards.
   */
  maxWidth?: 'full' | 'narrow' | 'wide'
  className?: string
}

export function PageContent({ children, maxWidth = 'full', className }: PageContentProps) {
  return (
    <div
      className={cn(
        'min-h-screen p-6 md:p-8',
        maxWidth === 'narrow' && 'mx-auto max-w-3xl',
        maxWidth === 'wide' && 'mx-auto max-w-6xl',
        className
      )}
    >
      {children}
    </div>
  )
}
