import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useNightWorker } from '@/contexts/NightWorkerContext'
import { toast } from 'sonner'
import { Eye, EyeOff, Link2, Lock } from 'lucide-react'

export default function NWConnect() {
  const { config, setConfig, setToken } = useNightWorker()
  const [baseUrl, setBaseUrl] = useState(config.baseUrl || 'http://localhost:5555')
  const [token, setTokenInput] = useState(config.token || '')
  const [showToken, setShowToken] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setConfig({ baseUrl })
    setToken(token.trim())
    toast.success('Conexão configurada', { description: `Usando ${baseUrl}` })
    navigate('/')
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
                onChange={(e) => setBaseUrl(e.target.value)}
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
                  onChange={(e) => setTokenInput(e.target.value)}
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

            <div className="flex items-center justify-end gap-3">
              <Button variant="ghost" type="button" onClick={() => { setTokenInput(''); setBaseUrl('http://localhost:5555') }}>
                Limpar
              </Button>
              <Button type="submit" className="px-6">
                Conectar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
