import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  HelpCircle,
  Keyboard,
  Sparkles,
  Mail,
  RotateCcw,
  Play,
  Square,
  MessageSquare,
  PenTool,
  ImageIcon,
  Zap,
  Crosshair,
  BarChart3,
  ExternalLink,
} from 'lucide-react'
import { useOnboarding } from '@/hooks/useOnboarding'
import { loadDemoData, unloadDemoData } from '@/lib/demo-data'
import { getCurrentMonthCount, getUsageByMonth } from '@/lib/ai/usage-tracker'
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

const aiFeatures = [
  {
    icon: MessageSquare,
    title: 'Consultant (RAG Chat)',
    description:
      'Chat inteligente com contexto. Usa suas tarefas, metas e prioridades como referência para dar respostas personalizadas. Baseado em RAG (Retrieval-Augmented Generation).',
  },
  {
    icon: PenTool,
    title: 'Content Generator',
    description:
      'Gera textos, expande tópicos e refina conteúdo com diferentes estilos e tons. Ideal para criar descrições de projetos, relatórios e ideias.',
  },
  {
    icon: ImageIcon,
    title: 'Image Generation',
    description:
      'Cria imagens com DALL-E. Suporta diferentes tamanhos, estilos e qualidades. Permite variações, edição e upscaling.',
  },
  {
    icon: BarChart3,
    title: 'Insights & Analytics',
    description:
      'Analisa suas métricas de produtividade e gera insights automáticos: padrões positivos, alertas, sugestões e previsões baseadas no seu histórico.',
  },
  {
    icon: Zap,
    title: 'Automação',
    description:
      'Sugestões de automação baseadas nos seus padrões de uso. Pode sugerir workflows, lembretes e ações automáticas para otimizar sua rotina.',
  },
  {
    icon: Crosshair,
    title: 'Prioridades (RAG)',
    description:
      'Priorização inteligente com embeddings. O sistema avalia suas prioridades, detecta alinhamento com metas e sugere próximos passos baseado em contexto.',
  },
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
    {
      q: 'O que é RAG?',
      a: 'RAG (Retrieval-Augmented Generation) é uma técnica que combina busca de informações relevantes com geração de texto. O Consultant usa seus dados (tarefas, metas, journal) como contexto para dar respostas mais precisas.',
    },
    {
      q: 'Posso desativar as features de AI?',
      a: 'Sim! Em Configurações > Uso de AI, você pode desativar individualmente cada feature que usa AI (Consultant, Content Generator, Insights, Imagens, Automação e Assistant).',
    },
    {
      q: 'Existe limite de uso da AI?',
      a: 'O uso da AI é controlado pelas APIs de terceiros (OpenAI). Você pode ver o resumo de chamadas no mês em Configurações > Uso de AI. Se houver rate limit, o app exibirá uma mensagem amigável.',
    },
  ]

  const monthCount = getCurrentMonthCount()
  const usageHistory = getUsageByMonth()

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
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <HelpCircle className="h-7 w-7 text-primary" />
          {t('onboarding.help.title')}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {t('onboarding.help.description')}
        </p>
      </header>

      {/* Quick actions */}
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="faq" className="gap-1.5">
            <HelpCircle className="h-4 w-4" /> FAQ
          </TabsTrigger>
          <TabsTrigger value="shortcuts" className="gap-1.5">
            <Keyboard className="h-4 w-4" /> Atalhos
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-1.5">
            <Sparkles className="h-4 w-4" /> AI
          </TabsTrigger>
          <TabsTrigger value="usage" className="gap-1.5">
            <BarChart3 className="h-4 w-4" /> Uso
          </TabsTrigger>
        </TabsList>

        {/* FAQ Tab */}
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

        {/* Shortcuts Tab */}
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

        {/* AI Features Tab */}
        <TabsContent value="ai" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            O LifeOS utiliza inteligência artificial em diversas features para ajudar na sua produtividade.
            Abaixo está um resumo de cada feature que usa AI e o que ela faz.
          </p>
          {aiFeatures.map((feature) => (
            <Card key={feature.title}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <feature.icon className="h-5 w-5 text-primary" />
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Chamadas de AI este mês</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-primary">{monthCount}</span>
                <span className="text-sm text-muted-foreground">chamadas</span>
              </div>
            </CardContent>
          </Card>
          {usageHistory.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Histórico mensal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {usageHistory.slice(-6).reverse().map((u) => (
                    <div key={u.month} className="flex items-center justify-between rounded-lg bg-muted/50 p-2 text-sm">
                      <span className="text-muted-foreground">{u.month}</span>
                      <Badge variant="secondary">{u.count} chamadas</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Support Contact */}
      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <span className="font-medium text-sm">Precisa de ajuda?</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('onboarding.help.support')}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <a href="mailto:suporte@lifeos.app">
                <Mail className="h-4 w-4" />
                suporte@lifeos.app
              </a>
            </Button>
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <a href="https://discord.gg/lifeos" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Discord
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
