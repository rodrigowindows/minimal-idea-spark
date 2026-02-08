import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { FileQuestion } from 'lucide-react'
import { PageBreadcrumbs } from '@/components/layout/PageBreadcrumbs'

const NotFound = () => {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <PageBreadcrumbs items={[{ label: t('nav.dashboard'), href: '/' }, { label: '404' }]} className="absolute left-6 top-6" />
      <div className="max-w-md text-center">
        <FileQuestion className="mx-auto mb-4 h-16 w-16 text-muted-foreground" aria-hidden />
        <h1 className="mb-2 text-3xl font-bold text-foreground">404</h1>
        <h2 className="mb-2 text-xl font-semibold text-foreground">{t('notFound.title')}</h2>
        <p className="mb-6 text-muted-foreground">{t('notFound.description')}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link to="/">{t('notFound.goHome')}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/settings">{t('notFound.goSettings')}</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default NotFound
