/**
 * Night Worker Daemon: Worker contínuo com polling inteligente
 *
 * Processa prompts pending de múltiplos providers em loop infinito.
 *
 * Uso:
 *   SUPABASE_URL=https://xxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ...
 *   node --env-file=.env --experimental-strip-types scripts/nightworker-worker-daemon.ts
 *
 * Ou com npx tsx:
 *   npx tsx scripts/nightworker-worker-daemon.ts
 *
 * Variáveis de ambiente opcionais:
 *   - NIGHTWORKER_API_URL: override do endpoint (padrão: SUPABASE_URL/functions/v1/nightworker-prompts)
 *   - WORKER_POLL_INTERVAL_MS: intervalo base de polling (padrão: 10000ms = 10s)
 *   - WORKER_IDLE_INTERVAL_MS: intervalo quando não há pending (padrão: 30000ms = 30s)
 *   - WORKER_MAX_BATCH_SIZE: max prompts por batch (padrão: 5)
 *   - WORKER_PROVIDERS: providers separados por vírgula (padrão: "codex,claude")
 *   - WORKER_MAX_RETRIES: max tentativas de processamento (padrão: 3)
 *   - WORKER_RETRY_BACKOFF_MS: base do backoff exponencial (padrão: 60000ms = 1min)
 */

const BASE =
  process.env.NIGHTWORKER_API_URL ||
  (process.env.SUPABASE_URL ? `${process.env.SUPABASE_URL}/functions/v1/nightworker-prompts` : '')

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Configuração
const POLL_INTERVAL_MS = Number(process.env.WORKER_POLL_INTERVAL_MS || '10000')
const IDLE_INTERVAL_MS = Number(process.env.WORKER_IDLE_INTERVAL_MS || '30000')
const MAX_BATCH_SIZE = Number(process.env.WORKER_MAX_BATCH_SIZE || '5')
const PROVIDERS = (process.env.WORKER_PROVIDERS || 'codex,claude').split(',').map(p => p.trim())
const MAX_PATCH_RETRIES = 3 // Retries para chamadas HTTP (PATCH)
const PATCH_BACKOFF_MS = 1000 // Backoff base para retries HTTP
const MAX_PROCESSING_RETRIES = Number(process.env.WORKER_MAX_RETRIES || '3') // Retries de processamento
const RETRY_BACKOFF_BASE_MS = Number(process.env.WORKER_RETRY_BACKOFF_MS || '60000') // 1 minuto base

// Estatísticas
let stats = {
  processed: 0,
  succeeded: 0,
  failed: 0,
  retried: 0, // Prompts que falharam mas serão tentados novamente
  errors: 0,
  polls: 0,
  startTime: Date.now(),
}

function requestId(): string {
  return crypto.randomUUID?.() ?? `req-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

function log(level: 'info' | 'warn' | 'error', msg: string, data?: Record<string, unknown>) {
  const ts = new Date().toISOString()
  const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '📡'
  console.log(`[${ts}] ${prefix} ${msg}`, data ? JSON.stringify(data) : '')
}

function jitter(ms: number): number {
  return Math.floor(ms * (0.8 + 0.4 * Math.random()))
}

async function api<T = unknown>(
  path: string,
  options: { method?: string; body?: object; requestId?: string } = {}
): Promise<{ status: number; data: T; requestId: string }> {
  const rid = options.requestId ?? requestId()
  const url = `${BASE.replace(/\/+$/, '')}/${path.replace(/^\//, '')}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    'X-Request-Id': rid,
  }
  const start = Date.now()

  try {
    const res = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    })
    const latencyMs = Date.now() - start
    const contentType = res.headers.get('content-type') || ''
    const data = contentType.includes('application/json')
      ? await res.json().catch(() => ({}))
      : await res.text()
    const resRequestId = res.headers.get('X-Request-Id') ?? rid

    if (res.status >= 400) {
      log('warn', `API ${options.method || 'GET'} ${path}`, {
        request_id: resRequestId,
        status: res.status,
        latency_ms: latencyMs,
        error: data
      })
    }

    return { status: res.status, data: data as T, requestId: resRequestId }
  } catch (err) {
    const latencyMs = Date.now() - start
    log('error', `API ${options.method || 'GET'} ${path} failed`, {
      request_id: rid,
      latency_ms: latencyMs,
      error: err instanceof Error ? err.message : String(err)
    })
    throw err
  }
}

async function fetchPending(provider: string): Promise<Array<{
  id: string
  name: string
  content: string
  target_folder?: string
  attempts?: number
}>> {
  const { status, data } = await api<{ total: number; prompts: unknown[] }>(
    `prompts?status=pending&provider=${encodeURIComponent(provider)}&limit=${MAX_BATCH_SIZE}`
  )
  if (status !== 200) throw new Error(`GET pending failed: ${status}`)
  const prompts = (data as any)?.prompts ?? []
  return prompts.map((p: any) => ({
    id: p.id,
    name: p.name,
    content: p.content,
    target_folder: p.target_folder,
    attempts: p.attempts ?? 0,
  }))
}

async function patchWithRetry(
  id: string,
  body: {
    status?: 'done' | 'failed'
    result_content?: string
    result_path?: string
    error?: string
    attempts?: number
    next_retry_at?: string | null
    event_type?: string
    event_message?: string
  }
): Promise<{ ok: boolean; status: number; data?: unknown }> {
  const rid = requestId()
  let lastStatus = 0
  let lastData: unknown

  for (let attempt = 0; attempt < MAX_PATCH_RETRIES; attempt++) {
    try {
      const { status, data } = await api(`prompts/${id}`, { method: 'PATCH', body, requestId: rid })
      lastStatus = status
      lastData = data

      if (status === 200) return { ok: true, status, data }
      if (status === 409) {
        log('info', 'PATCH idempotent (409)', { id, request_id: rid })
        return { ok: true, status: 409, data }
      }
      if (status === 404 || status === 400) return { ok: false, status, data }

      // Retryable error (5xx, timeout, etc)
      const delay = jitter(PATCH_BACKOFF_MS * Math.pow(2, attempt))
      log('warn', `PATCH retry ${attempt + 1}/${MAX_PATCH_RETRIES}`, {
        status,
        id,
        request_id: rid,
        retry_in_ms: delay
      })
      await new Promise((r) => setTimeout(r, delay))
    } catch (e) {
      lastStatus = 0
      lastData = e
      const delay = jitter(PATCH_BACKOFF_MS * Math.pow(2, attempt))
      log('error', `PATCH exception retry ${attempt + 1}/${MAX_PATCH_RETRIES}`, {
        id,
        error: String(e),
        request_id: rid,
        retry_in_ms: delay
      })
      if (attempt === MAX_PATCH_RETRIES - 1) return { ok: false, status: 0, data: lastData }
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  return { ok: false, status: lastStatus, data: lastData }
}

async function markDone(
  id: string,
  result: { result_content?: string; result_path?: string; attempts?: number }
): Promise<boolean> {
  const { ok } = await patchWithRetry(id, {
    status: 'done',
    result_content: result.result_content ?? 'ok',
    result_path: result.result_path,
    attempts: result.attempts ?? 1,
    event_type: 'done',
    event_message: 'Processed by worker daemon',
  })
  return ok
}

async function markFailed(
  id: string,
  err: string,
  attempts: number,
  nextRetryAt: string | null
): Promise<boolean> {
  const { ok } = await patchWithRetry(id, {
    status: 'failed',
    error: err,
    attempts,
    next_retry_at: nextRetryAt,
    event_type: nextRetryAt ? 'retry_scheduled' : 'failed',
    event_message: nextRetryAt
      ? `Failed (attempt ${attempts}/${MAX_PROCESSING_RETRIES}). Next retry: ${nextRetryAt}`
      : `Failed permanently after ${attempts} attempts: ${err}`,
  })
  return ok
}

/**
 * Calcula próximo retry usando backoff exponencial com jitter.
 * Formula: base * 2^(attempt-1) + jitter
 * Exemplo (base=60s): 1m, 2m, 4m, 8m, 16m...
 */
function calculateNextRetry(attempts: number): string | null {
  if (attempts >= MAX_PROCESSING_RETRIES) {
    return null // Não tenta mais
  }

  // Backoff exponencial: 1min, 2min, 4min, 8min...
  const backoffMs = RETRY_BACKOFF_BASE_MS * Math.pow(2, attempts - 1)

  // Adiciona jitter (±20%) para evitar thundering herd
  const jitterMs = backoffMs * (0.8 + 0.4 * Math.random())

  // Limite máximo de 1 hora
  const delayMs = Math.min(jitterMs, 3600000)

  return new Date(Date.now() + delayMs).toISOString()
}

/**
 * Simula processamento do prompt.
 * SUBSTITUIR POR LÓGICA REAL:
 *   - Chamar CLI do provider (codex, claude)
 *   - Executar API do LLM
 *   - Salvar resultado em arquivo
 */
async function processPrompt(prompt: {
  id: string
  name: string
  content: string
  target_folder?: string
  attempts: number
}): Promise<{ success: boolean; result_content?: string; error?: string }> {
  // MOCK: Simula processamento (substituir por lógica real)
  log('info', '🔧 Processing prompt', { id: prompt.id, name: prompt.name })

  await new Promise(r => setTimeout(r, 1000)) // Simula delay de processamento

  // Simula sucesso 90% das vezes
  if (Math.random() > 0.1) {
    return {
      success: true,
      result_content: `Resultado do processamento: ${prompt.name}\n\nConteúdo original:\n${prompt.content.slice(0, 200)}...`,
    }
  } else {
    return {
      success: false,
      error: 'Erro simulado no processamento',
    }
  }
}

async function processOneBatch(provider: string): Promise<number> {
  const pending = await fetchPending(provider)

  if (pending.length === 0) {
    return 0
  }

  log('info', `📦 Batch fetched`, { provider, count: pending.length })

  for (const prompt of pending) {
    try {
      stats.processed++

      const result = await processPrompt(prompt)

      if (result.success) {
        const ok = await markDone(prompt.id, {
          result_content: result.result_content,
          attempts: prompt.attempts + 1
        })
        if (ok) {
          stats.succeeded++
          log('info', '✅ Done', { id: prompt.id, name: prompt.name })
        } else {
          stats.errors++
          log('error', 'Failed to mark done', { id: prompt.id })
        }
      } else {
        const newAttempts = prompt.attempts + 1
        const nextRetry = calculateNextRetry(newAttempts)
        const ok = await markFailed(prompt.id, result.error || 'Unknown error', newAttempts, nextRetry)

        if (ok) {
          if (nextRetry) {
            stats.retried++
            log('warn', `⚠️  Failed, retry scheduled`, {
              id: prompt.id,
              name: prompt.name,
              attempt: newAttempts,
              max_retries: MAX_PROCESSING_RETRIES,
              next_retry_at: nextRetry,
              error: result.error
            })
          } else {
            stats.failed++
            log('error', `❌ Failed permanently`, {
              id: prompt.id,
              name: prompt.name,
              attempts: newAttempts,
              error: result.error
            })
          }
        } else {
          stats.errors++
          log('error', 'Failed to mark failed', { id: prompt.id })
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      const newAttempts = prompt.attempts + 1
      const nextRetry = calculateNextRetry(newAttempts)

      log('error', 'Processing exception', {
        id: prompt.id,
        error: msg,
        attempt: newAttempts,
        will_retry: !!nextRetry
      })

      const ok = await markFailed(prompt.id, msg, newAttempts, nextRetry)

      if (ok && nextRetry) {
        stats.retried++
      } else if (ok && !nextRetry) {
        stats.failed++
      } else {
        stats.errors++
      }
    }
  }

  return pending.length
}

function printStats() {
  const uptimeMin = Math.floor((Date.now() - stats.startTime) / 60000)
  const uptimeStr = uptimeMin < 60
    ? `${uptimeMin}m`
    : `${Math.floor(uptimeMin / 60)}h ${uptimeMin % 60}m`

  log('info', '📊 Stats', {
    uptime: uptimeStr,
    polls: stats.polls,
    processed: stats.processed,
    succeeded: stats.succeeded,
    retried: stats.retried,
    failed: stats.failed,
    errors: stats.errors,
  })
}

async function pollLoop() {
  log('info', '🚀 Worker daemon started', {
    base: BASE,
    providers: PROVIDERS,
    poll_interval_ms: POLL_INTERVAL_MS,
    idle_interval_ms: IDLE_INTERVAL_MS,
    max_batch_size: MAX_BATCH_SIZE,
    max_retries: MAX_PROCESSING_RETRIES,
    retry_backoff_base_ms: RETRY_BACKOFF_BASE_MS,
  })

  while (true) {
    try {
      stats.polls++
      let totalProcessed = 0

      for (const provider of PROVIDERS) {
        const count = await processOneBatch(provider)
        totalProcessed += count
      }

      // Print stats every 10 polls
      if (stats.polls % 10 === 0) {
        printStats()
      }

      // Intelligent polling: fast when busy, slow when idle
      const nextInterval = totalProcessed > 0 ? POLL_INTERVAL_MS : IDLE_INTERVAL_MS
      const nextIntervalStr = nextInterval >= 1000 ? `${nextInterval / 1000}s` : `${nextInterval}ms`

      if (totalProcessed === 0) {
        log('info', `💤 Idle, next poll in ${nextIntervalStr}`, {})
      }

      await new Promise(r => setTimeout(r, nextInterval))
    } catch (err) {
      log('error', 'Poll loop error', {
        error: err instanceof Error ? err.message : String(err)
      })
      // Wait before retrying on error
      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS))
    }
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  log('info', '🛑 Shutting down...', {})
  printStats()
  process.exit(0)
})

process.on('SIGTERM', () => {
  log('info', '🛑 Shutting down...', {})
  printStats()
  process.exit(0)
})

// Validação e start
if (!BASE || !SERVICE_ROLE_KEY) {
  log('error', 'Missing configuration', {
    has_base: !!BASE,
    has_service_role_key: !!SERVICE_ROLE_KEY,
  })
  console.error('\nSet SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NIGHTWORKER_API_URL) in .env')
  process.exit(1)
}

pollLoop().catch((e) => {
  log('error', 'Fatal error', { error: e instanceof Error ? e.message : String(e) })
  printStats()
  process.exit(1)
})
