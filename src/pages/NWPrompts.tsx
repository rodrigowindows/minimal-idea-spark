import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/night-worker/StatusBadge'
import { ProviderBadge } from '@/components/night-worker/ProviderBadge'
import { useCreatePromptMutation, usePromptsQuery } from '@/hooks/useNightWorkerApi'
import { useNightWorker } from '@/contexts/NightWorkerContext'
import type { PromptItem } from '@/types/night-worker'
import { Calendar, Filter, RefreshCw, Search, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

const PAGE_SIZE = 20

export default function NWPrompts() {
  const navigate = useNavigate()
  const { isConnected, apiFetch, config } = useNightWorker()
  const { data, isLoading, isError, error, refetch, isFetching } = usePromptsQuery(15000)
  const resendMutation = useCreatePromptMutation()

  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'done' | 'failed'>('all')
  const [providerFilter, setProviderFilter] = useState<'all' | 'codex' | 'claude'>('all')
  const [query, setQuery] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)

  // Debug logging to understand loading state in production
  useEffect(() => {
    console.info('[NightWorker][Prompts] state', {
      isConnected,
      isLoading,
      isFetching,
      isError,
      dataCount: data?.length ?? 0,
    })
  }, [data?.length, isConnected, isLoading, isFetching, isError])

  const filtered = useMemo(() => {
    return (data || []).filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false
      if (providerFilter !== 'all' && !item.provider?.includes(providerFilter)) return false
      if (query && !item.name.toLowerCase().includes(query.toLowerCase())) return false
      const created = new Date(item.updated_at || item.created_at || '')
      if (fromDate && created < new Date(fromDate)) return false
      if (toDate && created > new Date(`${toDate}T23:59:59`)) return false
      return true
    }).sort((a, b) => {
      const aDate = new Date(a.updated_at || a.created_at || 0).getTime()
      const bDate = new Date(b.updated_at || b.created_at || 0).getTime()
      return bDate - aDate
    })
  }, [data, fromDate, providerFilter, query, statusFilter, toDate])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleClear = () => {
    setStatusFilter('all')
    setProviderFilter('all')
    setQuery('')
    setFromDate('')
    setToDate('')
    setPage(1)
  }

  const handleResend = async (prompt: PromptItem) => {
    try {
      const detail = await apiFetch<PromptItem>(`/prompts/${prompt.id}/status`)
      const content = detail.content || prompt.content
      if (!content) {
        toast.error('Não há conteúdo para reenviar.')
        return
      }
      await resendMutation.mutateAsync({
        provider: detail.provider || prompt.provider,
        name: `${prompt.name}-retry`,
        content,
        target_folder: detail.target_folder
          || prompt.target_folder
          || config.workers[(prompt.provider && prompt.provider.toLowerCase().includes('claude')) ? 'claude' : 'codex'].folder
          || '',
      })
      toast.success('Prompt reenviado', { description: `${prompt.name}-retry` })
    } catch {
      toast.error('Falha ao reenviar')
    }
  }

  return (
    <div className="px-4 pb-10 md:px-8">
      {!isConnected && (
        <Alert className="mb-4 border-amber-500/40 bg-amber-500/10 text-amber-100">
          <AlertTitle>Configure a conexão</AlertTitle>
          <AlertDescription>
            Defina a URL e o token em <button className="underline" onClick={() => navigate('/connect')}>/connect</button> para listar prompts.
          </AlertDescription>
        </Alert>
      )}

      {isError && (
        <Alert className="mb-4 border-red-500/40 bg-red-500/10 text-red-100">
          <AlertTitle>Erro ao carregar</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Não foi possível contatar a API. Verifique a URL/token.'}
            <div className="mt-2">
              <Button size="sm" variant="outline" onClick={() => refetch()}>Tentar novamente</Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.1em] text-blue-200">Fila de prompts</p>
          <h1 className="text-3xl font-bold text-foreground">Prompts</h1>
          <p className="text-sm text-muted-foreground">Filtro por status, provider, data e busca por nome.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => navigate('/submit')}>Enviar novo</Button>
        </div>
      </div>

      <Card className="border border-white/10 bg-card/70 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Filter className="h-4 w-4" /> Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'pending', 'done', 'failed'] as const).map((status) => (
              <Badge
                key={status}
                variant="outline"
                className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold ${
                  statusFilter === status ? 'border-blue-500/60 bg-blue-500/10 text-blue-100' : 'border-border/60 text-muted-foreground'
                }`}
                onClick={() => { setStatusFilter(status); setPage(1) }}
              >
                {status === 'all' ? 'Todos' : status === 'pending' ? 'Pendentes' : status === 'done' ? 'Concluídos' : 'Falhas'}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'codex', 'claude'] as const).map((p) => (
              <Badge
                key={p}
                variant="outline"
                className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold ${
                  providerFilter === p ? 'border-blue-500/60 bg-blue-500/10 text-blue-100' : 'border-border/60 text-muted-foreground'
                }`}
                onClick={() => { setProviderFilter(p); setPage(1) }}
              >
                {p === 'all' ? 'Todos' : p === 'codex' ? 'Codex' : 'Claude'}
              </Badge>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(1) }}
                className="pl-10 bg-background/60"
              />
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1) }} className="bg-background/60" />
              <span className="text-xs text-muted-foreground">até</span>
              <Input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1) }} className="bg-background/60" />
            </div>
            <div className="flex justify-end">
              <Button variant="ghost" onClick={handleClear}>Limpar filtros</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4 border border-white/10 bg-card/70 backdrop-blur">
        <CardHeader>
          <CardTitle>Lista completa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-border/70 bg-background/60 shadow-inner">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60">
                  <TableHead>Status</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Pasta alvo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(isLoading || isFetching) && Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-border/60">
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-24 rounded-full ml-auto" /></TableCell>
                  </TableRow>
                ))}

                {!isLoading && paginated.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Send className="h-6 w-6 text-blue-300" />
                        <p>Nenhum prompt encontrado</p>
                        <Button onClick={() => navigate('/submit')}>Enviar primeiro prompt</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {paginated.map((prompt) => (
                  <TableRow key={prompt.id} className="border-border/60">
                    <TableCell><StatusBadge status={prompt.status} pulse={prompt.status === 'pending'} /></TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{prompt.id}</TableCell>
                    <TableCell className="font-semibold text-foreground">{prompt.name}</TableCell>
                    <TableCell><ProviderBadge provider={prompt.provider} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {(() => {
                        const dateValue = prompt.updated_at || prompt.created_at
                        return dateValue ? new Date(dateValue).toLocaleString() : '—'
                      })()}
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate font-mono text-xs text-blue-200">{prompt.target_folder || '—'}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/prompts/${prompt.id}`)}>Ver</Button>
                      {prompt.status === 'failed' && (
                        <Button variant="outline" size="sm" onClick={() => handleResend(prompt)} disabled={resendMutation.isPending}>
                          Reenviar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Página {page} de {pageCount} — {filtered.length} registros
            </span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Anterior</Button>
              <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page === pageCount}>Próxima</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
