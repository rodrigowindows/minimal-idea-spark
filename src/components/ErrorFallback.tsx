import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface ErrorFallbackProps {
  error: Error
  onRetry?: () => void
}

export function ErrorFallback({ error, onRetry }: ErrorFallbackProps) {
  const { t } = useTranslation()

  return (
    <div
      className="flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-xl border border-border bg-destructive/5 p-8 text-center"
      role="alert"
      aria-live="assertive"
    >
      <AlertTriangle className="h-12 w-12 text-destructive" aria-hidden />
      <h3 className="text-lg font-semibold text-foreground">{t('errors.generic')}</h3>
      <p className="max-w-md text-sm text-muted-foreground">{error.message}</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            {t('common.errorRetry')}
          </Button>
        )}
        <Button asChild variant="default">
          <Link to="/">{t('common.goHome')}</Link>
        </Button>
      </div>
    </div>
  )
}
