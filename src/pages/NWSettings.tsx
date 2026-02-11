import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { useNightWorker } from '@/contexts/NightWorkerContext'
import { toast } from 'sonner'
import { Copy, Eye, EyeOff, KeyRound, Save, Settings2, Shield } from 'lucide-react'
import type { WorkerConfig } from '@/types/night-worker'

export default function NWSettings() {
  const { config, setConfig, setToken } = useNightWorker()
  const [showToken, setShowToken] = useState(false)
  const [localConfig, setLocalConfig] = useState(config)

  useEffect(() => {
    setLocalConfig(config)
  }, [config])

  const handleSave = () => {
    setConfig(localConfig)
    setToken(localConfig.token)
    toast.success('Configurações salvas')
  }

  return (
    <div className="px-4 pb-16 md:px-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.1em] text-blue-200">Sistema</p>
          <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
          <p className="text-sm text-muted-foreground">
            API (edge) cria/lista prompts; workers executam e devolvem resultado para a mesma API.
          </p>
        </div>
        <Badge variant="outline" className="rounded-full border-blue-500/40 bg-blue-500/10 text-blue-200">
          <Settings2 className="mr-1 h-4 w-4" /> Night Worker
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border border-white/10 bg-card/70 backdrop-blur">
          <CardHeader>
            <CardTitle>API</CardTitle>
            <CardDescription>
              Edge Supabase que recebe/retorna prompts. O painel usa este token para criar/listar; o worker só lê e faz PATCH aqui.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Token atual</Label>
              <div className="relative">
                <Input
                  type={showToken ? 'text' : 'password'}
                  value={localConfig.token || ''}
                  onChange={(e) => setLocalConfig((p) => ({ ...p, token: e.target.value }))}
                  className="bg-background/60 pr-20"
                />
                <div className="absolute inset-y-1 right-1 flex items-center gap-1 pr-1">
                  <Button variant="ghost" size="icon" onClick={() => setShowToken((v) => !v)}>
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => navigator.clipboard.writeText(localConfig.token || '')}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-yellow-400/80 flex items-start gap-1.5 rounded-md border border-yellow-500/20 bg-yellow-500/5 p-2">
                <Shield className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>
                  Use o token <strong>anon</strong> do Supabase (<code className="text-xs">VITE_SUPABASE_PUBLISHABLE_KEY</code>).
                  Não gere tokens aleatórios — eles causarão erro 500.
                </span>
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Base URL</Label>
                <Input
                  value={localConfig.baseUrl}
                  onChange={(e) => setLocalConfig((p) => ({ ...p, baseUrl: e.target.value }))}
                  className="bg-background/60"
                />
                <p className="text-xs text-muted-foreground">
                  Endpoint da edge (`.../functions/v1/nightworker-prompts`). Painel cria/lista aqui; workers também consomem daqui.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Porta</Label>
                <Input
                  type="number"
                  value={localConfig.port}
                  onChange={(e) => setLocalConfig((p) => ({ ...p, port: Number(e.target.value) }))}
                  className="bg-background/60"
                />
                <p className="text-xs text-muted-foreground">Campo legado para rodar worker local; ignorado na edge.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-white/10 bg-card/70 backdrop-blur">
          <CardHeader>
            <CardTitle>Providers disponíveis</CardTitle>
            <CardDescription>
              Providers que o worker aceita processar. Alterar aqui deve refletir no worker real (Backend B).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {localConfig.providers.map((p) => (
              <Badge key={p} variant="outline" className="rounded-full border-border/60 bg-background/50">
                {p}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <WorkerSettings
          title="Worker Claude"
          config={localConfig.workers.claude}
          onChange={(next) => setLocalConfig((p) => ({ ...p, workers: { ...p.workers, claude: next } }))}
        />
        <WorkerSettings
          title="Worker Codex"
          config={localConfig.workers.codex}
          onChange={(next) => setLocalConfig((p) => ({ ...p, workers: { ...p.workers, codex: next } }))}
          extraFields
        />
      </div>

      <div className="sticky bottom-4 mt-8 flex justify-end">
        <Button className="gap-2 px-6 shadow-[0_10px_40px_-12px_rgba(59,130,246,0.6)]" onClick={handleSave}>
          <Save className="h-4 w-4" /> Salvar Configurações
        </Button>
      </div>
    </div>
  )
}

function WorkerSettings({
  title,
  config,
  onChange,
  extraFields,
}: {
  title: string
  config: WorkerConfig
  onChange: (next: WorkerConfig) => void
  extraFields?: boolean
}) {
  const set = (patch: Partial<typeof config>) => onChange({ ...config, ...patch })
  return (
    <Card className="border border-white/10 bg-card/70 backdrop-blur">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>Loop do worker (Backend B): polling, janela e limites de execução.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Ativo</span>
          <Switch checked={config.active} onCheckedChange={(v) => set({ active: v })} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Provider" value={config.provider} onChange={(v) => set({ provider: v })} />
          <Field label="Pasta do worker" value={config.folder || ''} onChange={(v) => set({ folder: v })} />
          <Field label="Janela início" value={config.windowStart} onChange={(v) => set({ windowStart: v })} type="time" />
          <Field label="Janela fim" value={config.windowEnd} onChange={(v) => set({ windowEnd: v })} type="time" />
          <Field label="Intervalo (s)" value={config.intervalSeconds} onChange={(v) => set({ intervalSeconds: Number(v) })} type="number" />
          <Field label="Timeout CLI (s)" value={config.timeoutSeconds} onChange={(v) => set({ timeoutSeconds: Number(v) })} type="number" />
          <Field label="Máx arquivos/pasta" value={config.maxFiles} onChange={(v) => set({ maxFiles: Number(v) })} type="number" />
          <Field label="Máx tamanho prompt" value={config.maxPromptSize} onChange={(v) => set({ maxPromptSize: Number(v) })} type="number" />
          {extraFields && (
            <>
              <Field label="Caminho Codex CLI" value={config.cliPath || ''} onChange={(v) => set({ cliPath: v })} />
              <Field label="Modelo" value={config.model || ''} onChange={(v) => set({ model: v })} />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string | number
  onChange: (value: string) => void
  type?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-background/60"
      />
    </div>
  )
}
