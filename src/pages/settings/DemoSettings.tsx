import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Info, Mail, Play, RotateCcw, Sparkles, Square } from 'lucide-react'
import { toast } from 'sonner'

import {
  getAIPreferences,
  getCurrentMonthCount,
  setAIPreferences,
  type AIPreferences,
} from '@/lib/ai/usage-tracker'
import { loadDemoData, unloadDemoData } from '@/lib/demo-data'
import { useOnboarding } from '@/hooks/useOnboarding'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'

const AI_FEATURES: Array<{
  key: keyof AIPreferences
  label: string
  description: string
}> = [
  {
    key: 'enableConsultant',
    label: 'Consultant (RAG Chat)',
    description: 'Chat inteligente com contexto das suas tarefas e metas',
  },
  {
    key: 'enableContentGenerator',
    label: 'Content Generator',
    description: 'Geração e refinamento de textos com AI',
  },
  {
    key: 'enableInsights',
    label: 'Insights & Analytics',
    description: 'Insights automáticos de produtividade',
  },
  {
    key: 'enableImageGeneration',
    label: 'Image Generation',
    description: 'Geração de imagens com DALL-E',
  },
  {
    key: 'enableAutomationSuggestions',
    label: 'Sugestões de Automação',
    description: 'Sugestões automáticas de workflows',
  },
  {
    key: 'enableAssistant',
    label: 'AI Assistant (Widget)',
    description: 'Assistente flutuante com ações rápidas',
  },
]

export function DemoSettings() {
  const { t } = useTranslation()
  const { demoMode, resetTour, toggleDemoMode } = useOnboarding()
  const [aiPrefs, setAiPrefs] = useState<AIPreferences>(() => getAIPreferences())
  const aiMonthCount = getCurrentMonthCount()

  return (
    <>
      <Card className="rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            {t('onboarding.help.demoMode')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{t('onboarding.help.demoModeDesc')}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                resetTour()
                toast.info(t('onboarding.help.tourRestarted'))
              }}
            >
              <RotateCcw className="h-4 w-4" />
              {t('onboarding.help.restartTour')}
            </Button>
            <Button
              variant={demoMode ? 'destructive' : 'outline'}
              size="sm"
              className="gap-2"
              onClick={() => {
                if (demoMode) {
                  unloadDemoData()
                  toggleDemoMode()
                  toast.info(t('onboarding.help.demoUnloaded'))
                  return
                }
                loadDemoData()
                toggleDemoMode()
                toast.info(t('onboarding.help.demoLoaded'))
              }}
            >
              {demoMode ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {demoMode ? t('onboarding.help.disableDemo') : t('onboarding.help.enableDemo')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Uso de AI
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Gerencie as features que usam inteligência artificial e veja o consumo mensal.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <span className="text-sm text-muted-foreground">Chamadas este mês</span>
            <Badge variant="secondary">{aiMonthCount}</Badge>
          </div>

          {AI_FEATURES.map((feature) => (
            <div key={feature.key} className="flex items-center justify-between">
              <div className="flex-1 pr-4">
                <p className="text-sm font-medium">{feature.label}</p>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </div>
              <Switch
                checked={aiPrefs[feature.key]}
                onCheckedChange={(value) => {
                  const updated = { ...aiPrefs, [feature.key]: value }
                  setAiPrefs(updated)
                  setAIPreferences({ [feature.key]: value })
                  toast.success(t('common.saved'))
                }}
              />
            </div>
          ))}

          <Button variant="link" className="px-0 text-sm" asChild>
            <Link to="/help">Ver detalhes de cada feature de AI</Link>
          </Button>
        </CardContent>
      </Card>

      <TranscriptionHistory />

      <Card className="rounded-xl lg:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Info className="h-5 w-5 text-primary" />
            {t('settings.aboutLifeOS')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('settings.aboutDescription')}{' '}
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">
              ?
            </kbd>{' '}
            {t('settings.aboutShortcuts')}
          </p>
          <div className="flex flex-wrap gap-2 border-t border-border/50 pt-2">
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <Link to="/help">
                <Info className="h-4 w-4" />
                Central de Ajuda
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <a href="mailto:suporte@lifeos.app">
                <Mail className="h-4 w-4" />
                suporte@lifeos.app
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

