import { AutomationBuilder } from '@/components/Automation/Builder'
import { ContextualTip } from '@/components/Onboarding/ContextualTip'
import { AIFeatureInfo } from '@/components/AIFeatureInfo'

export function AutomationPage() {
  return (
    <div>
      <div className="mx-6 mt-6 flex items-center gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight">Automação</h1>
        <AIFeatureInfo feature="automation" />
      </div>
      <ContextualTip
        tipId="automation-intro"
        titleKey="onboarding.contextualTips.automationTitle"
        descriptionKey="onboarding.contextualTips.automationDesc"
        className="mx-6 mt-3"
      />
      <AutomationBuilder />
    </div>
  )
}
