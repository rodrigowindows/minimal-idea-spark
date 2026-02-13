import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useHealthQuery, useLogsQuery } from '@/hooks/useNightWorkerApi'
import { ApiError, useNightWorker } from '@/contexts/NightWorkerContext'
import type { LogEntry } from '@/types/night-worker'
import { Activity, Filter, Pause, Play, RefreshCw, Trash2, WifiOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export default function NWLogs() {
  const { isConnected, config } = useNightWorker()
  const navigate = useNavigate()
  const [worker, setWorker] = useState<'codex' | 'claude' | 'all'>('codex')
  const [level, setLevel] = useState<'INFO' | 'WARN' | 'ERROR' | 'ALL'>('ALL')
  const [query, setQuery] = useState('')
  const [autoScroll, setAutoScroll] = useState(true)
  const [paused, setPaused] = useState(false)
  const [buffer, setBuffer] = useState<LogEntry[]>([])
  const [since, setSince] = useState<string | undefined>(undefined)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const { data: health } = useHealthQuery()
  const { data, refetch, isFetching, error, isError } = useLogsQuery(
    { worker, level: level === 'ALL' ? undefined : level, lines: 200, since },
    { enabled: isConnected && !paused, refetchInterval: autoScroll ? 4000 : 8000 }
  )
  const logsUnavailable = isError && error instanceof ApiError && error.status === 404
  const isSupabase = config.baseUrl.includes('.supabase.co')

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.info('[NWLogs] Component Mounted');
    }
  }, []);

  useEffect(() => {
    if (!data) return
    setBuffer((prev) => {
      const merged = [...prev, ...data].slice(-500)
      const last = merged[merged.length - 1]
      if (last) setSince(last.timestamp)
      return merged
    })
  }, [data])

  useEffect(() => {
    if (!autoScroll || paused) return
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [buffer, autoScroll, paused])

  const filtered = useMemo(() => {
    return buffer.filter((line) => {
      if (level !== 'ALL' && line.level !== level) return false
      if (worker !== 'all' && !line.worker.toLowerCase().includes(worker)) return false
      if (query && !line.message.toLowerCase().includes(query.toLowerCase())) return false
      return true
    })
  }, [buffer, level, query, worker])
  const lastTimestamp = buffer.length ? buffer[buffer.length - 1].timestamp : null

  const handleForceRefresh = () => {
    window.location.reload()
  }

  return (
    <div className="px-4 pb-10 md:px-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.1em] text-blue-200">Monitor</p>
          <h1 className="text-3xl font-bold text-foreground">Logs em Tempo Real</h1>
          <p className="text-sm text-muted-foreground">Filtre por worker e nível. Auto-scroll ligado por padrão.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
          <Badge variant="outline" className="rounded-full border-blue-500/40 bg-blue-500/10 text-blue-100">
            Polling ativo
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 mb-6 lg:grid-cols-3">
        <Card className="border border-white/10 bg-card/70 backdrop-blur lg:col-span-2">
          <CardHeader className="py-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-4 w-4 text-emerald-400" /> Monitor de Saúde
            </CardTitle>
          </CardHeader>
          <CardContent className="py-0 pb-4">
            <div className="flex flex-wrap gap-6">
              <div className="space-y-1">
                <p className="text-[10px] uppercase text-muted-foreground">Status Geral</p>
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${health?.status === 'ok' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-red-500'}`} />
                  <span className="font-semibold">{health?.status === 'ok' ? 'Operacional' : 'Offline'}</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase text-muted-foreground">Versão API</p>
                <p className="font-mono text-sm">{health?.version || '---'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase text-muted-foreground">Providers Ativos</p>
                <div className="flex gap-1">
                  {health?.providers?.map(p => (
                    <Badge key={p} variant="secondary" className="px-1.5 py-0 text-[10px]">{p}</Badge>
                  )) || <span className="text-sm text-muted-foreground">Nenhum</span>}
                </div>
              </div>
              {health?.uptime && (
                <div className="space-y-1">
                  <p className="text-[10px] uppercase text-muted-foreground">Uptime</p>
                  <p className="text-sm">{health.uptime}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-amber-500/20 bg-amber-500/5 backdrop-blur">
          <CardHeader className="py-4">
            <CardTitle className="text-sm text-amber-200">Nota de Conexão</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-amber-100/70">
            {isSupabase ? (
              <p>Você está usando o backend <strong>Supabase</strong>. Logs em tempo real exigem uma conexão direta com o worker local ou via API B.</p>
            ) : (
              <p>Conectado ao <strong>Worker Direto</strong>. Se os logs não aparecerem, verifique se o script <code>worker.py</code> está rodando.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {logsUnavailable && (
        <Alert className="mb-4 border-amber-500/40 bg-amber-500/10 text-amber-100">
          <AlertTitle className="flex items-center justify-between">
            Logs não disponíveis
            <Button size="sm" variant="outline" onClick={handleForceRefresh} className="h-6 text-[10px]">Forçar Refresh</Button>
          </AlertTitle>
          <AlertDescription>
            Este backend ({isSupabase ? 'Supabase Edge' : 'Legacy'}) não expõe logs via HTTP. 
            Use um <strong>Worker Direto (API B)</strong> ou verifique o console do seu worker local.
          </AlertDescription>
        </Alert>
      )}

      <Card className="border border-white/10 bg-card/70 backdrop-blur">
        <CardHeader className="flex flex-row items-start justify-between gap-3 font-semibold">
          <div>
            <CardTitle className="flex items-center gap-2"><Filter className="h-4 w-4" /> Filtros do Console</CardTitle>
          </div>
          {!isConnected && (
            <Badge variant="outline" className="flex items-center gap-1 border-red-500/60 bg-red-500/10 text-red-200">
              <WifiOff className="h-4 w-4" /> Desconectado
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {(['codex', 'claude', 'all'] as const).map((option) => (
              <Button
                key={option}
                variant={worker === option ? 'default' : 'outline'}
                onClick={() => setWorker(option)}
                className={worker === option ? 'bg-blue-600 text-white' : ''}
              >
                {option === 'all' ? 'Ambos' : option === 'codex' ? 'Codex' : 'Claude'}
              </Button>
            ))}

            {(['ALL', 'INFO', 'WARN', 'ERROR'] as const).map((lvl) => (
              <Badge
                key={lvl}
                variant="outline"
                className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold ${
                  level === lvl ? 'border-blue-500/60 bg-blue-500/10 text-blue-100' : 'border-border/60 text-muted-foreground'
                }`}
                onClick={() => setLevel(lvl)}
              >
                {lvl}
              </Badge>
            ))}

            <div className="relative flex-1 min-w-[180px]">
              <Input
                placeholder="Buscar no log"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="bg-background/60"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch id="autoscroll" checked={autoScroll} onCheckedChange={setAutoScroll} />
              <label htmlFor="autoscroll" className="text-sm text-muted-foreground">Auto-scroll</label>
            </div>

            <Button
              variant="outline"
              onClick={() => setPaused((p) => !p)}
              className="gap-2"
            >
              {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              {paused ? 'Retomar' : 'Pausar'}
            </Button>
            <Button variant="ghost" onClick={() => setBuffer([])} className="gap-2">
              <Trash2 className="h-4 w-4" /> Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4 border border-white/10 bg-[#0B1221]">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg">Console</CardTitle>
            <CardDescription>Últimas {filtered.length} linhas (max 500 no buffer)</CardDescription>
          </div>
          <Badge variant="outline" className="rounded-full border-border/60 bg-background/40 text-xs">
            Auto-scroll {autoScroll ? 'on' : 'off'}
          </Badge>
        </CardHeader>
        <CardContent>
          <div
            ref={scrollRef}
            className="font-mono text-xs leading-6 text-slate-100/90 max-h-[520px] overflow-auto rounded-lg border border-border/40 bg-[#0A0F1A] p-4 shadow-inner"
          >
            {logsUnavailable && (
              <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-amber-200">
                Logs não disponíveis neste backend (edge-only). Use um worker local para ver logs em tempo real.
              </p>
            )}
            {!logsUnavailable && filtered.length === 0 && (
              <p className="text-muted-foreground">Nenhuma linha ainda.</p>
            )}
            {filtered.map((line, idx) => (
              <LogLine key={`${line.timestamp}-${idx}`} entry={line} />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-500'}`} aria-hidden />
              <span>{isConnected ? 'Conectado' : 'Desconectado'}</span>
              <span>· Buffer: {buffer.length}</span>
              <span>· Filtrado: {filtered.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>Auto-scroll {autoScroll ? 'ligado' : 'desligado'}</span>
              <span>· {paused ? 'Pausado' : 'Tempo real'}</span>
              {lastTimestamp && <span>· Último update: {formatTime(lastTimestamp)}</span>}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function LogLine({ entry }: { entry: LogEntry }) {
  const levelColor =
    entry.level === 'ERROR' ? 'text-red-400' : entry.level === 'WARN' ? 'text-amber-300' : 'text-slate-100'
  const workerLabel = entry.worker || 'Worker'
  const workerColor = workerLabel.toLowerCase().includes('claude') ? 'text-purple-300' : 'text-blue-300'
  const time = formatTime(entry.timestamp)
  return (
    <div className="group flex items-start gap-2 rounded-md px-2 py-1 transition-colors hover:bg-white/5">
      <span className="text-slate-500">[{time}]</span>
      <span className={`${levelColor} font-semibold min-w-[52px] text-right`}>{entry.level}</span>
      <span className={`${workerColor} font-semibold`}>[{workerLabel}]</span>
      <span className="text-slate-100">{entry.message}</span>
    </div>
  )
}

function formatTime(value: string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleTimeString()
}
