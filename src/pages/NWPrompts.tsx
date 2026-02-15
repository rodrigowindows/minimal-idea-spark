import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatusBadge } from '@/components/night-worker/StatusBadge'
import { ProviderBadge } from '@/components/night-worker/ProviderBadge'
import { PromptsKanban } from '@/components/night-worker/PromptsKanban'
import { useCreatePromptMutation, useHealthQuery, usePromptsQuery } from '@/hooks/useNightWorkerApi'
import { useNightWorker } from '@/contexts/NightWorkerContext'
import { useKanbanState } from '@/hooks/useKanbanState'
import type { PromptItem } from '@/types/night-worker'
import { Filter, Info, Kanban, List, Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

const PAGE_SIZE = 20

export default function NWPrompts() {
  const navigate = useNavigate()
  const { apiFetch } = useNightWorker()
  const { data: health } = useHealthQuery()
  const { data, isLoading, isError, error, refetch, isFetching } = usePromptsQuery(15000)
  const resendMutation = useCreatePromptMutation()

  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'processing' | 'done' | 'failed'>('all')
  const [providerFilter, setProviderFilter] = useState<'all' | 'codex' | 'claude' | 'gemini'>('all')
  const [query, setQuery] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)

  const kanban = useKanbanState(data)

  const filtered = useMemo(() => {
    return (data || [])
      .filter((item) => {
        if (statusFilter !== 'all' && item.status !== statusFilter) return false
        if (providerFilter !== 'all' && !item.provider?.includes(providerFilter)) return false
        if (query && !item.name.toLowerCase().includes(query.toLowerCase())) return false
        const created = new Date(item.updated_at || item.created_at || '')
        if (fromDate && created < new Date(fromDate)) return false
        if (toDate && created > new Date(`${toDate}T23:59:59`)) return false
        return true
      })
      .sort((a, b) => {
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
      const detail = await apiFetch<PromptItem>(`/prompts/${prompt.id}`)
      const content = detail.content || prompt.content
      if (!content) {
        toast.error('Nao ha conteudo para reenviar.')
        return
      }
      await resendMutation.mutateAsync({
        provider: detail.provider || prompt.provider,
        name: `${prompt.name}-retry`,
        content,
        target_folder: detail.target_folder || prompt.target_folder || '',
      })
      toast.success('Prompt reenviado')
    } catch {
      toast.error('Falha ao reenviar')
    }
  }

  return (
    <div className="px-4 pb-10 md:px-8">
      {isError && (
        <Alert className="mb-4 border-red-500/40 bg-red-500/10 text-red-100">
          <AlertTitle>Erro ao carregar</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Nao foi possivel contatar a API.'}
            <Button size="sm" variant="outline" onClick={() => refetch()} className="ml-3">Retry</Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.1em] text-blue-200">Fila de prompts</p>
          <h1 className="text-3xl font-bold text-foreground">Prompts</h1>
          <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${health?.status === 'ok' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-red-500'}`} />
              <span className="font-medium text-[13px]">
                {health?.status === 'ok' ? 'API Online' : 'API Offline'}
              </span>
            </div>
            {health?.workers && health.workers.length > 0 && (
              <div className="flex items-center gap-2 border-l border-border/40 pl-3">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-[11px] uppercase tracking-wider text-blue-300 font-bold">Worker Ativo</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'kanban')}>
            <TabsList>
              <TabsTrigger value="list" className="gap-2"><List className="h-4 w-4" /> Lista</TabsTrigger>
              <TabsTrigger value="kanban" className="gap-2"><Kanban className="h-4 w-4" /> Kanban</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => navigate('/nw/submit')}>Novo</Button>
        </div>
      </div>

      {viewMode === 'kanban' && (
        <Alert className="mb-4 border-blue-500/20 bg-blue-500/5 text-blue-200 py-2">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-[11px] italic">
            Nota: As colunas <strong>Priorizado</strong> e <strong>Doing</strong> sao apenas organizadores visuais locais.
            O processamento real e feito pelo <code>worker.py</code> em ordem de criacao.
          </AlertDescription>
        </Alert>
      )}

      <div className="sticky top-14 z-20 mb-4 flex flex-wrap gap-3 rounded-xl border border-border/60 bg-background/85 px-3 py-2 backdrop-blur">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Status</span>
          {(['all', 'pending', 'processing', 'done', 'failed'] as const).map((status) => (
            <Badge
              key={status}
              variant="outline"
              className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold ${
                statusFilter === status ? 'border-blue-500/60 bg-blue-500/10 text-blue-100' : 'border-border/60 text-muted-foreground'
              }`}
              onClick={() => {
                setStatusFilter(status)
                setPage(1)
              }}
            >
              {status === 'all'
                ? 'Todos'
                : status === 'pending'
                  ? 'Pendentes'
                  : status === 'processing'
                    ? 'Processando'
                    : status === 'done'
                      ? 'Concluidos'
                      : 'Falhas'}
            </Badge>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Button variant="ghost" size="sm" onClick={handleClear}>Limpar</Button>
          {viewMode === 'kanban' && (
            <Button variant="ghost" size="sm" onClick={kanban.clearKanban} className="text-amber-400">Reset Kanban</Button>
          )}
        </div>
      </div>

      {isLoading && !data && (
        <div className="mt-6 flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          <p className="text-sm font-medium">Carregando prompts...</p>
        </div>
      )}

      {viewMode === 'kanban' && !isLoading && (
        <PromptsKanban
          prompts={filtered}
          prioritizedIds={kanban.prioritizedIds}
          doingIds={kanban.doingIds}
          onMoveToBacklog={kanban.moveToBacklog}
          onMoveToPrioritized={kanban.moveToPrioritized}
          onMoveToDoing={kanban.moveToDoing}
          onReorderPrioritized={kanban.reorderPrioritized}
        />
      )}

      {viewMode === 'list' && !isLoading && (
        <Card className="mt-4 border border-white/10 bg-card/70 backdrop-blur">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Tentativas</TableHead>
                  <TableHead>Proximo retry</TableHead>
                  <TableHead>Atualizado</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Nenhum registro.</TableCell></TableRow>
                )}
                {paginated.map((prompt) => (
                  <TableRow key={prompt.id}>
                    <TableCell><StatusBadge status={prompt.status} pulse={prompt.status === 'pending' || prompt.status === 'processing'} /></TableCell>
                    <TableCell className="font-semibold">{prompt.name}</TableCell>
                    <TableCell><ProviderBadge provider={prompt.provider} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{prompt.attempts ?? 0}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(prompt.next_retry_at)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(prompt.updated_at || prompt.created_at || '').toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/nw/prompts/${prompt.id}`)}>Ver</Button>
                        {prompt.status === 'failed' && (
                          <Button variant="outline" size="sm" onClick={() => handleResend(prompt)} disabled={resendMutation.isPending}>
                            Reenviar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</Button>
          <span className="text-xs text-muted-foreground">Pagina {page} de {pageCount}</span>
          <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>Proxima</Button>
        </div>
      )}
    </div>
  )
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString()
}
