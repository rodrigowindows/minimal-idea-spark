/**
 * Exemplo de worker Night Worker: usa apenas a edge function Supabase como fonte de verdade.
 *
 * Uso (com service-role no .env):
 *   SUPABASE_URL=https://xxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ...
 *   node --env-file=.env --experimental-strip-types scripts/nightworker-worker-example.ts
 *
 * Ou: npx tsx scripts/nightworker-worker-example.ts
 *
 * O worker:
 * 1) Busca pendentes: GET /prompts?status=pending&provider=<provider>
 * 2) Processa (simulado aqui) e conclui: PATCH /prompts/{id} com status=done, result_content, event_type=done
 * 3) Em falha: PATCH com status=failed, error, attempts, next_retry_at
 * 4) Backoff/retentativas em caso de falha no PATCH
 */

const BASE =
  process.env.NIGHTWORKER_API_URL ||
  (process.env.SUPABASE_URL ? `${process.env.SUPABASE_URL}/functions/v1/nightworker-prompts` : '')

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const MAX_PATCH_RETRIES = 3
const PATCH_BACKOFF_MS = 1000

function requestId(): string {
  return crypto.randomUUID?.() ?? `req-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

function log(prefix: string, msg: string, data?: Record<string, unknown>) {
  const ts = new Date().toISOString()
  console.log(`[${ts}] [${prefix}] ${msg}`, data ?? '')
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
  log('worker', 'request', { request_id: rid, method: options.method || 'GET', path })
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
  log('worker', 'response', { request_id: resRequestId, status: res.status, latency_ms: latencyMs })
  return { status: res.status, data: data as T, requestId: resRequestId }
}

/** GET pendentes para um provider */
async function fetchPending(provider: string): Promise<{ id: string; name: string; content: string; target_folder?: string }[]> {
  const { status, data } = await api<{ total: number; prompts: unknown[] }>(
    `prompts?status=pending&provider=${encodeURIComponent(provider)}&limit=10`
  )
  if (status !== 200) throw new Error(`GET pending failed: ${status}`)
  const prompts = (data as any)?.prompts ?? []
  return prompts.map((p: any) => ({
    id: p.id,
    name: p.name,
    content: p.content,
    target_folder: p.target_folder,
  }))
}

/** PATCH com retentativas apenas para 5xx/timeout; 409 = já processado (sucesso lógico). */
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
      if (status === 409) return { ok: true, status: 409, data }
      if (status === 404 || status === 400) return { ok: false, status, data }
      const delay = jitter(PATCH_BACKOFF_MS * Math.pow(2, attempt))
      log('worker', `PATCH attempt ${attempt + 1}/${MAX_PATCH_RETRIES} failed (retryable), retry in ${delay}ms`, { status, id, request_id: rid })
      await new Promise((r) => setTimeout(r, delay))
    } catch (e) {
      lastStatus = 0
      lastData = e
      const delay = jitter(PATCH_BACKOFF_MS * Math.pow(2, attempt))
      log('worker', `PATCH attempt ${attempt + 1}/${MAX_PATCH_RETRIES} error (retry in ${delay}ms)`, { id, error: String(e), request_id: rid })
      if (attempt === MAX_PATCH_RETRIES - 1) return { ok: false, status: 0, data: lastData }
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  return { ok: false, status: lastStatus, data: lastData }
}

/** Marca prompt como concluído */
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
    event_message: 'Processed by worker',
  })
  return ok
}

/** Marca prompt como falha e agenda retry */
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
    event_type: 'failed',
    event_message: err,
  })
  return ok
}

async function main() {
  if (!BASE || !SERVICE_ROLE_KEY) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NIGHTWORKER_API_URL) in .env')
    process.exit(1)
  }

  const provider = process.argv[2] || 'codex'
  log('worker', 'starting', { provider, base: BASE })

  const pending = await fetchPending(provider)
  log('worker', 'pending count', { count: pending.length })

  for (const prompt of pending) {
    try {
      log('worker', 'processing', { id: prompt.id, name: prompt.name })
      // Simular processamento (no real worker: chamar CLI/LLM aqui)
      const resultContent = `Processed: ${prompt.name}`
      const ok = await markDone(prompt.id, { result_content: resultContent, attempts: 1 })
      if (ok) log('worker', 'marked done', { id: prompt.id })
      else log('worker', 'mark done failed', { id: prompt.id })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      log('worker', 'error', { id: prompt.id, error: msg })
      const nextRetry = new Date(Date.now() + 60_000).toISOString()
      await markFailed(prompt.id, msg, 1, nextRetry)
    }
  }

  log('worker', 'run complete', { processed: pending.length })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
