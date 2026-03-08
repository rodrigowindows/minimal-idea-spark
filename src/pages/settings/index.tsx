import { Settings2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { PageContent } from '@/components/layout/PageContent'
import { PageHeader } from '@/components/layout/PageHeader'

import { DemoSettings } from './DemoSettings'
import { SecuritySettings } from './SecuritySettings'
import { TagSettings } from './TagSettings'

export function Settings() {
  const { t } = useTranslation()

  return (
    <PageContent>
      <PageHeader
        icon={<Settings2 className="h-6 w-6 text-primary" />}
        title={t('settings.title')}
        variant="compact"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <GeneralSettings />
        <SecuritySettings />
        <IntegrationSettings />
        <BackupSettings />
        <DomainSettings />
        <TagSettings />
        <DemoSettings />
      </div>
    </PageContent>
  )
}

