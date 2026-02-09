import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

const skipLinkClass =
  'sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring'

export function SkipLink({ className }: { className?: string }) {
  const { t } = useTranslation()
  return (
    <div role="navigation" aria-label={t('a11y.skipLinksLabel')}>
      <a href="#main-content" className={cn(skipLinkClass, className)}>
        {t('a11y.skipToContent')}
      </a>
      <a href="#main-nav" className={cn(skipLinkClass, 'focus:top-14', className)}>
        {t('a11y.skipToNav')}
      </a>
    </div>
  )
}
