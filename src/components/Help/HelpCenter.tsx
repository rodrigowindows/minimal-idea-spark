import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { HelpCircle, Keyboard, Sparkles, Mail } from 'lucide-react'

const shortcutsList = [
  { keys: ['N'], description: 'Dashboard' },
  { keys: ['J'], description: 'Journal' },
  { keys: ['C'], description: 'Consultant' },
  { keys: ['/'], description: 'Busca global' },
  { keys: ['?'], description: 'Mostrar atalhos' },
  { keys: ['Alt', '1'], description: 'Dashboard' },
  { keys: ['Alt', '2'], description: 'Consultant' },
  { keys: ['Alt', '3'], description: 'Opportunities' },
  { keys: ['Alt', '4'], description: 'Journal' },
  { keys: ['F'], description: 'Deep Work' },
  { keys: ['Esc'], description: 'Fechar modal' },
]

const FAQ = [
  { q: 'O que é o War Room?', a: 'É o painel principal onde você captura ideias, vê sua meta do dia e acessa atalhos rápidos.' },
  { q: 'Como usar o Consultor?', a: 'Digite perguntas ou peça sugestões. O assistente usa suas oportunidades, diário e prioridades para responder.' },
  { q: 'O que são Oportunidades?', a: 'São itens capturados (tarefas, ideias, projetos) que você pode mover entre Backlog, Em andamento, Revisão e Concluído.' },
  { q: 'Como funciona o Deep Work?', a: 'Ative com F ou pelo menu. O modo tela cheia ajuda no foco; use o Pomodoro para blocos de 25 min.' },
  { q: 'Onde ficam meus dados?', a: 'Por padrão os dados ficam no navegador (localStorage). Com Supabase configurado, podem ser sincronizados na nuvem.' },
]

export function HelpCenter() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <HelpCircle className="h-7 w-7 text-primary" />
          Central de Ajuda
        </h1>
        <p className="mt-1 text-muted-foreground">
          FAQ, atalhos e como usar as principais funções.
        </p>
      </header>

      <Tabs defaultValue="faq">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="faq" className="gap-2">
            <HelpCircle className="h-4 w-4" /> FAQ
          </TabsTrigger>
          <TabsTrigger value="shortcuts" className="gap-2">
            <Keyboard className="h-4 w-4" /> Atalhos
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2">
            <Sparkles className="h-4 w-4" /> Uso de IA
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
                    <span className="text-sm text-muted-foreground">{s.description}</span>
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
              <CardTitle className="text-base">Uso de IA</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                O app usa IA no Consultor, geração de conteúdo, insights de analytics, assistente de chat e geração de imagens.
                As chamadas são processadas pelas Edge Functions do Supabase. Em caso de muitas requisições (erro 429),
                aguarde alguns minutos antes de tentar novamente.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardContent className="flex items-center gap-2 pt-6">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Suporte: abra uma issue no repositório do projeto ou entre em contato pelo email do projeto.
          </span>
        </CardContent>
      </Card>
    </div>
  )
}
