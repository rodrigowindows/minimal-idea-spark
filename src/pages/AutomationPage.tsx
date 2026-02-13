import { AutomationBuilder } from '@/components/Automation/Builder'
import { ContextualTip } from '@/components/Onboarding/ContextualTip'
import { AIFeatureInfo } from '@/components/AIFeatureInfo'
import { Zap } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageContent } from '@/components/layout/PageContent'

export function AutomationPage() {
  return (
    <PageContent>
      <PageHeader
        icon={<Zap className="h-6 w-6 text-primary" />}
        title="Automação"
        variant="compact"
        actions={<AIFeatureInfo feature="automation" />}
      />
      <ContextualTip
        tipId="automation-intro"
        titleKey="onboarding.contextualTips.automationTitle"
        descriptionKey="onboarding.contextualTips.automationDesc"
      />
      <AutomationBuilder />
    </PageContent>
  )
}
