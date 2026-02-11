import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useNightWorker } from '@/contexts/NightWorkerContext'
import { toast } from 'sonner'
import { CheckCircle2, Eye, EyeOff, Link2, Loader2, Lock, XCircle } from 'lucide-react'

type HealthInfo = { version?: string; providers?: string[] }

export default function NWConnect() {
  const { config, setConfig, setToken } = useNightWorker()
  const suggested =
    (import.meta.env.VITE_NIGHTWORKER_API_URL as string | undefined)?.replace(/\/+$/, '') ||
    (import.meta.env.VITE_SUPABASE_URL
      ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nightworker-prompts`
      : 'https://coder-ai.workfaraway.com')
  const [baseUrl, setBaseUrl] = useState(config.baseUrl || suggested)
  const [token, setTokenInput] = useState(config.token || '')
  const [showToken, setShowToken] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'idle' | 'success' | 'health-fail' | 'auth-fail'>('idle')
  const navigate = useNavigate()

  useEffect(() => {
    setBaseUrl(config.baseUrl || suggested)
  }, [config.baseUrl, suggested])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTesting(true)
    setTestResult('idle')

    const cleanUrl = baseUrl.replace(/\/+$/, '')

    try {
      // Step 1 (best-effort): /health can be absent in edge-only deployments.
      let healthData: HealthInfo | null = null
      try {
        const healthRes = await fetch(`${cleanUrl}/health`)
        if (healthRes.ok) {
          healthData = await healthRes.json()
        } else {
          console.warn('[NWConnect] /health unavailable', { status: healthRes.status })
        }
      } catch (healthErr) {
        console.warn('[NWConnect] /health request failed', healthErr)
      }

      // Step 2 (required): validate token against /prompts.
      const promptsRes = await fetch(`${cleanUrl}/prompts`, {
        headers: { Authorization: `Bearer ${token.trim()}` },
      })
      if (promptsRes.status === 401 || promptsRes.status === 403) {
        setTestResult('auth-fail')
        toast.error('Token invalido', { description: `GET /prompts retornou ${promptsRes.status}.` })
        setTesting(false)
        return
      }
      if (!promptsRes.ok) {
        setTestResult('health-fail')
        toast.error('Falha na conexao', { description: `GET /prompts retornou ${promptsRes.status}` })
        setTesting(false)
        return
      }

      // Success - save and navigate
      setTestResult('success')
      setConfig({ baseUrl: cleanUrl })
      setToken(token.trim())
      const providerText =
        healthData?.providers?.length
          ? healthData.providers.join(', ')
          : 'edge sem health detalhado'
      toast.success('Conectado com sucesso', {
        description: `API v${healthData?.version || 'edge'} - Providers: ${providerText}`,
      })
      setTimeout(() => navigate('/'), 600)
    } catch {
      setTestResult('health-fail')
      toast.error('Nao foi possivel conectar', {
        description: `Verifique se a API esta rodando em ${cleanUrl}`,
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      {config.baseUrl.includes('supabase.co') && (
        <Alert className="absolute top-20 left-1/2 -translate-x-1/2 w-auto max-w-2xl border-emerald-500/40 bg-emerald-500/10 text-emerald-100">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Já conectado automaticamente</AlertTitle>
          <AlertDescription>
            Usando Supabase edge: {config.baseUrl.split('/functions')[0]}
          </AlertDescription>
        </Alert>
      )}
      <Card className="w-full max-w-2xl border border-blue-500/30 bg-card/70 shadow-2xl shadow-blue-500/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-foreground">Configurar Servidor Externo</CardTitle>
              <CardDescription>
                O Supabase edge já está conectado automaticamente.
                <br />
                <span className="text-xs text-muted-foreground">
                  Use esta página apenas para conectar em servidor externo (ex: coder-ai.workfaraway.com).
                </span>
              </CardDescription>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-300">
              <Lock className="h-6 w-6" aria-hidden />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="baseUrl" className="flex items-center gap-2 text-sm font-semibold">
                <Link2 className="h-4 w-4" /> URL da API
              </Label>
              <Input
                id="baseUrl"
                value={baseUrl}
                onChange={(e) => { setBaseUrl(e.target.value); setTestResult('idle') }}
                placeholder={suggested}
                required
                className="bg-background/70"
              />
              <p className="text-xs text-muted-foreground">Sugestao: {suggested}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="token" className="flex items-center gap-2 text-sm font-semibold">
                <Lock className="h-4 w-4" /> Token Bearer
              </Label>
              <div className="relative">
                <Input
                  id="token"
                  type={showToken ? 'text' : 'password'}
                  value={token}
                  onChange={(e) => { setTokenInput(e.target.value); setTestResult('idle') }}
                  placeholder="coloque o token aqui"
                  required
                  className="bg-background/70 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowToken((v) => !v)}
                  className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
                  aria-label={showToken ? 'Esconder token' : 'Mostrar token'}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Seu token e salvo apenas no navegador (localStorage).</p>
            </div>

            {testResult !== 'idle' && (
              <div className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
                testResult === 'success'
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                  : testResult === 'health-fail'
                    ? 'border-red-500/40 bg-red-500/10 text-red-200'
                    : 'border-amber-500/40 bg-amber-500/10 text-amber-200'
              }`}>
                {testResult === 'success' && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                {testResult === 'health-fail' && <XCircle className="h-4 w-4 shrink-0" />}
                {testResult === 'auth-fail' && <XCircle className="h-4 w-4 shrink-0" />}
                <span>
                  {testResult === 'success' && 'Conexao validada com sucesso!'}
                  {testResult === 'health-fail' && 'Nao foi possivel conectar a API. Verifique a URL.'}
                  {testResult === 'auth-fail' && 'Token invalido ou nao autorizado.'}
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                type="button"
                onClick={() => {
                  setTokenInput('')
                  setBaseUrl(suggested)
                  setTestResult('idle')
                }}
              >
                Limpar
              </Button>
              <Button type="submit" className="gap-2 px-6" disabled={testing}>
                {testing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Testando...
                  </>
                ) : (
                  'Conectar'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
