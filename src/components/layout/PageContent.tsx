import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageContentProps {
  children: ReactNode
  /** Use 'narrow' for reading-heavy pages (e.g. journal, article) */
  maxWidth?: 'full' | 'narrow' | 'wide'
  className?: string
}

export function PageContent({ children, maxWidth = 'full', className }: PageContentProps) {
  return (
    <div
      className={cn(
        'min-h-screen p-4 md:p-6 lg:p-8',
        maxWidth === 'narrow' && 'mx-auto max-w-3xl',
        maxWidth === 'wide' && 'mx-auto max-w-6xl',
        className
      )}
    >
      {children}
    </div>
  )
}
