import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { AlertTriangle, WifiOff, ServerCrash, RefreshCw } from 'lucide-react'

interface ErrorFallbackProps {
  error: Error
  onRetry?: () => void
}

function classifyError(error: Error): 'network' | 'server' | 'generic' {
  const msg = error.message.toLowerCase()
  if (
    msg.includes('network') ||
    msg.includes('fetch') ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('timeout') ||
    msg.includes('aborted') ||
    !navigator.onLine
  ) {
    return 'network'
  }
  if (msg.includes('500') || msg.includes('502') || msg.includes('503') || msg.includes('server')) {
    return 'server'
  }
  return 'generic'
}

export function ErrorFallback({ error, onRetry }: ErrorFallbackProps) {
  const { t } = useTranslation()
  const errorType = classifyError(error)

  const config = {
    network: {
      icon: WifiOff,
      title: t('errors.networkTitle'),
      description: t('errors.networkDescription'),
      color: 'text-amber-500',
      bg: 'bg-amber-500/5 border-amber-500/20',
    },
    server: {
      icon: ServerCrash,
      title: t('errors.serverTitle'),
      description: t('errors.serverDescription'),
      color: 'text-orange-500',
      bg: 'bg-orange-500/5 border-orange-500/20',
    },
    generic: {
      icon: AlertTriangle,
      title: t('errors.boundaryTitle'),
      description: t('errors.boundaryDescription'),
      color: 'text-destructive',
      bg: 'bg-destructive/5 border-destructive/20',
    },
  }[errorType]

  const Icon = config.icon

  return (
    <div
      className={`flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-xl border p-8 text-center ${config.bg}`}
      role="alert"
      aria-live="assertive"
    >
      <Icon className={`h-12 w-12 ${config.color}`} aria-hidden />
      <h3 className="text-lg font-semibold text-foreground">{config.title}</h3>
      <p className="max-w-md text-sm text-muted-foreground">{config.description}</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {onRetry && (
          <Button onClick={onRetry} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
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
