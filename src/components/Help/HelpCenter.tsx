import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { HelpCircle, Keyboard, Sparkles, Mail, RotateCcw, Play, Square } from 'lucide-react'
import { useOnboarding } from '@/hooks/useOnboarding'
import { loadDemoData, unloadDemoData } from '@/lib/demo-data'
import { toast } from 'sonner'

const shortcutsList = [
  { keys: ['N'], descKey: 'nav.dashboard' },
  { keys: ['J'], descKey: 'nav.journal' },
  { keys: ['C'], descKey: 'nav.consultant' },
  { keys: ['/'], descKey: 'commandPalette.placeholder' },
  { keys: ['?'], descKey: 'onboarding.help.shortcuts' },
  { keys: ['Alt', '1'], descKey: 'nav.dashboard' },
  { keys: ['Alt', '2'], descKey: 'nav.consultant' },
  { keys: ['Alt', '3'], descKey: 'nav.opportunities' },
  { keys: ['Alt', '4'], descKey: 'nav.journal' },
  { keys: ['F'], descKey: 'nav.deepWork' },
  { keys: ['Esc'], descKey: 'common.close' },
]

export function HelpCenter() {
  const { t } = useTranslation()
  const { demoMode, resetTour, toggleDemoMode } = useOnboarding()

  const FAQ = [
    { q: t('onboarding.help.faqWarRoom'), a: t('onboarding.help.faqWarRoomAnswer') },
    { q: t('onboarding.help.faqConsultant'), a: t('onboarding.help.faqConsultantAnswer') },
    { q: t('onboarding.help.faqOpportunities'), a: t('onboarding.help.faqOpportunitiesAnswer') },
    { q: t('onboarding.help.faqDeepWork'), a: t('onboarding.help.faqDeepWorkAnswer') },
    { q: t('onboarding.help.faqData'), a: t('onboarding.help.faqDataAnswer') },
  ]

  const handleRestartTour = () => {
    resetTour()
    toast.info(t('onboarding.help.tourRestarted'))
  }

  const handleToggleDemo = () => {
    if (demoMode) {
      unloadDemoData()
      toggleDemoMode()
      toast.info(t('onboarding.help.demoUnloaded'))
    } else {
      loadDemoData()
      toggleDemoMode()
      toast.info(t('onboarding.help.demoLoaded'))
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <HelpCircle className="h-7 w-7 text-primary" />
          {t('onboarding.help.title')}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {t('onboarding.help.description')}
        </p>
      </header>

      {/* Quick actions: restart tour + demo mode */}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" size="sm" className="gap-2" onClick={handleRestartTour}>
          <RotateCcw className="h-4 w-4" />
          {t('onboarding.help.restartTour')}
        </Button>
        <Button
          variant={demoMode ? 'destructive' : 'outline'}
          size="sm"
          className="gap-2"
          onClick={handleToggleDemo}
        >
          {demoMode ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {demoMode ? t('onboarding.help.disableDemo') : t('onboarding.help.enableDemo')}
        </Button>
        {demoMode && (
          <Badge variant="secondary">{t('onboarding.help.demoModeActive')}</Badge>
        )}
      </div>

      <Tabs defaultValue="faq">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="faq" className="gap-2">
            <HelpCircle className="h-4 w-4" /> {t('onboarding.help.faq')}
          </TabsTrigger>
          <TabsTrigger value="shortcuts" className="gap-2">
            <Keyboard className="h-4 w-4" /> {t('onboarding.help.shortcuts')}
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2">
            <Sparkles className="h-4 w-4" /> {t('onboarding.help.aiUsage')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="faq" className="space-y-4">
          {FAQ.map((item, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{item.q}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{item.a}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="shortcuts">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                {shortcutsList.map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <span className="text-sm text-muted-foreground">{t(s.descKey)}</span>
                    <div className="flex gap-1">
                      {s.keys.map((key) => (
                        <kbd key={key} className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-xs">
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('onboarding.help.aiUsage')}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>{t('onboarding.help.aiUsageDesc')}</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardContent className="flex items-center gap-2 pt-6">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {t('onboarding.help.support')}
          </span>
        </CardContent>
      </Card>
    </div>
  )
}
