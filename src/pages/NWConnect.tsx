import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useNightWorker } from '@/contexts/NightWorkerContext'
import { toast } from 'sonner'
import { CheckCircle2, Eye, EyeOff, Link2, Loader2, Lock, XCircle } from 'lucide-react'

export default function NWConnect() {
  const { config, setConfig, setToken } = useNightWorker()
  const [baseUrl, setBaseUrl] = useState(config.baseUrl || 'http://localhost:5555')
  const [token, setTokenInput] = useState(config.token || '')
  const [showToken, setShowToken] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'idle' | 'success' | 'health-fail' | 'auth-fail'>('idle')
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTesting(true)
    setTestResult('idle')

    const cleanUrl = baseUrl.replace(/\/+$/, '')

    try {
      // Step 1: Test GET /health (no auth required)
      const healthRes = await fetch(`${cleanUrl}/health`)
      if (!healthRes.ok) {
        setTestResult('health-fail')
        toast.error('Falha na conexão', { description: `GET /health retornou ${healthRes.status}` })
        setTesting(false)
        return
      }
      const healthData = await healthRes.json()

      // Step 2: Test GET /prompts with auth token
      const promptsRes = await fetch(`${cleanUrl}/prompts`, {
        headers: { Authorization: `Bearer ${token.trim()}` },
      })
      if (promptsRes.status === 401) {
        setTestResult('auth-fail')
        toast.error('Token inválido', { description: 'GET /prompts retornou 401 Unauthorized.' })
        setTesting(false)
        return
      }
      if (!promptsRes.ok) {
        setTestResult('auth-fail')
        toast.error('Erro ao validar token', { description: `GET /prompts retornou ${promptsRes.status}` })
        setTesting(false)
        return
      }

      // Success - save and navigate
      setTestResult('success')
      setConfig({ baseUrl: cleanUrl })
      setToken(token.trim())
      toast.success('Conectado com sucesso', {
        description: `API v${healthData.version || '?'} — Providers: ${healthData.providers?.join(', ') || '?'}`,
      })
      setTimeout(() => navigate('/'), 600)
    } catch (err) {
      setTestResult('health-fail')
      toast.error('Não foi possível conectar', {
        description: `Verifique se a API está rodando em ${cleanUrl}`,
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <Card className="w-full max-w-2xl border border-blue-500/30 bg-card/70 shadow-2xl shadow-blue-500/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-foreground">Conectar ao Night Worker</CardTitle>
              <CardDescription>Informe a URL da API e o token Bearer para começar.</CardDescription>
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
                placeholder="http://localhost:5555"
                required
                className="bg-background/70"
              />
              <p className="text-xs text-muted-foreground">Default: http://localhost:5555</p>
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
              <p className="text-xs text-muted-foreground">Seu token é salvo apenas no navegador (localStorage).</p>
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
                  {testResult === 'success' && 'Conexão validada com sucesso!'}
                  {testResult === 'health-fail' && 'Não foi possível conectar à API. Verifique a URL.'}
                  {testResult === 'auth-fail' && 'Token inválido ou não autorizado.'}
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                type="button"
                onClick={() => {
                  setTokenInput('')
                  setBaseUrl('http://localhost:5555')
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
