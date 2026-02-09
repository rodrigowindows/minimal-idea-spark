import { AutomationBuilder } from '@/components/Automation/Builder'
import { ContextualTip } from '@/components/Onboarding/ContextualTip'

export function AutomationPage() {
  return (
    <div>
      <ContextualTip
        tipId="automation-intro"
        titleKey="onboarding.contextualTips.automationTitle"
        descriptionKey="onboarding.contextualTips.automationDesc"
        className="mx-6 mt-6"
      />
      <AutomationBuilder />
    </div>
  )
}
