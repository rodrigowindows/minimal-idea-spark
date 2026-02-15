import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id, x-worker-id',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
}

const MAX_BODY_BYTES = 1024 * 1024 // 1 MB
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100
const CACHE_MAX_AGE = 5 // seconds

const VALID_PROVIDERS = new Set(['codex', 'claude', 'codex_cli', 'claude_cli', 'openai_api', 'gemini', 'gemini_cli'])
const VALID_STATUSES = new Set(['pending', 'processing', 'done', 'failed'])
const VALID_QUEUE_STAGES = new Set(['backlog', 'prioritized'])
const VALID_WORKER_STATUSES = new Set(['active', 'paused', 'error'])
const WORKER_TOKEN_SCOPES = new Set(['claim', 'patch', 'heartbeat'])
const MAX_NAME_LEN = 500
const MAX_CONTENT_LEN = 500_000
const MAX_TARGET_FOLDER_LEN = 2000

type PromptStatus = 'pending' | 'processing' | 'done' | 'failed'
type Provider = 'codex' | 'claude' | 'codex_cli' | 'claude_cli' | 'openai_api' | 'gemini' | 'gemini_cli'
type QueueStage = 'backlog' | 'prioritized'

interface PromptPayload {
  provider: Provider
  name: string
  content: string
  target_folder?: string
  queue_stage?: QueueStage
  priority_order?: number | null
}

type AuthPrincipal =
  | { kind: 'none' }
  | { kind: 'service_role' }
  | { kind: 'worker_token'; token_id: string; worker_name: string; scopes: string[] }

// --- Observability: structured log helper ---
function log(level: 'info' | 'warn' | 'error', msg: string, ctx: Record<string, unknown> = {}) {
  const entry = { ts: new Date().toISOString(), level, msg, ...ctx }
  if (level === 'error') console.error(JSON.stringify(entry))
  else console.log(JSON.stringify(entry))
}

// --- Metrics counters (in-memory per invocation, logged at response) ---
let metricsBuffer: Record<string, unknown>[] = []
function metric(name: string, fields: Record<string, unknown>) {
  metricsBuffer.push({ metric: name, ts: new Date().toISOString(), ...fields })
}

function flushMetrics() {
  for (const m of metricsBuffer) console.log(JSON.stringify(m))
  metricsBuffer = []
}

function genRequestId(): string {
  return crypto.randomUUID()
}

function respHeaders(rid: string, cache = false): Record<string, string> {
  const h: Record<string, string> = { ...corsHeaders, 'X-Request-Id': rid }
  if (cache) h['Cache-Control'] = `private, max-age=${CACHE_MAX_AGE}`
  return h
}

// --- Sanitize: strip control chars (except newline/tab) from text fields ---
function sanitizeText(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
}

// --- UUID validation ---
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function isValidUUID(s: string): boolean {
  return UUID_RE.test(s)
}

function getBearerToken(req: Request): string {
  const auth = req.headers.get('Authorization') ?? ''
  return auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
}

function base64UrlDecode(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  return atob(padded)
}

function isServiceRoleToken(token: string): boolean {
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!token || !serviceKey) return false
  if (token === serviceKey) return true

  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false
    const payload = JSON.parse(base64UrlDecode(parts[1]))
    return payload.role === 'service_role' && typeof payload.iss === 'string' && payload.iss.includes('supabase')
  } catch {
    return false
  }
}

async function sha256Hex(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function authenticateRequest(req: Request, supabase: any, rid: string): Promise<AuthPrincipal> {
  const token = getBearerToken(req)
  if (!token) return { kind: 'none' }

  if (isServiceRoleToken(token)) {
    return { kind: 'service_role' }
  }

  const tokenHash = await sha256Hex(token)
  const { data, error } = await supabase
    .from('nw_worker_tokens')
    .select('id, worker_name, scopes, expires_at, revoked_at')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST116') return { kind: 'none' }
    throw error
  }

  if (!data) return { kind: 'none' }
  if (data.revoked_at) {
    log('warn', 'worker_token_revoked', { rid, token_id: data.id, worker_name: data.worker_name })
    return { kind: 'none' }
  }

  if (data.expires_at) {
    const expiresAtMs = new Date(data.expires_at).getTime()
    if (Number.isFinite(expiresAtMs) && expiresAtMs <= Date.now()) {
      log('warn', 'worker_token_expired', { rid, token_id: data.id, worker_name: data.worker_name, expires_at: data.expires_at })
      return { kind: 'none' }
    }
  }

  // best effort usage stamp
  await supabase.from('nw_worker_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', data.id)

  return {
    kind: 'worker_token',
    token_id: data.id,
    worker_name: data.worker_name,
    scopes: Array.isArray(data.scopes) ? data.scopes : [],
  }
}

function hasScope(auth: AuthPrincipal, requiredScope: string): boolean {
  if (auth.kind === 'service_role') return true
  if (auth.kind !== 'worker_token') return false
  return auth.scopes.includes('*') || auth.scopes.includes(requiredScope)
}

function requireScope(auth: AuthPrincipal, requiredScope: string, rid: string, action: string): Response | null {
  if (hasScope(auth, requiredScope)) return null
  log('warn', 'forbidden', { rid, action, required_scope: requiredScope, auth_kind: auth.kind })
  return json({ error: `Forbidden: ${action} requires '${requiredScope}' scope or service-role token` }, 403, { requestId: rid })
}

serve(async (req) => {
  const start = Date.now()
  // Prefer client-provided request-id for correlation, fall back to server-generated
  const rid = req.headers.get('x-request-id') || genRequestId()

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { ...corsHeaders, 'X-Request-Id': rid } })
  }

  const url = new URL(req.url)
  const fnName = 'nightworker-prompts'
  const pathParts = url.pathname.split('/').filter(Boolean)
  const fnIdx = pathParts.indexOf(fnName)
  const rest = fnIdx >= 0 ? pathParts.slice(fnIdx + 1) : pathParts
  const route = '/' + rest.join('/')
  const promptDetailMatch = route.match(/^\/prompts\/([^/]+)$/)
  const promptActionMatch = route.match(/^\/prompts\/([^/]+)\/(move|edit|reprocess)$/)

  log('info', 'request', { rid, method: req.method, route })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  let auth: AuthPrincipal = { kind: 'none' }
  try {
    auth = await authenticateRequest(req, supabase, rid)
  } catch (err) {
    log('error', 'auth_lookup_failed', { rid, error: err instanceof Error ? err.message : String(err) })
  }

  let resp: Response
  try {
    if (req.method === 'GET' && route === '/health') {
      resp = await handleHealth(supabase, rid)
    } else if (req.method === 'GET' && (route === '/' || route === '/prompts')) {
      resp = await handleList(supabase, url, rid)
    } else if (req.method === 'GET' && promptDetailMatch) {
      const id = promptDetailMatch[1]
      if (!isValidUUID(id)) {
        resp = json({ error: 'Invalid prompt ID format' }, 400, { requestId: rid })
      } else {
        resp = await handleGet(supabase, id, rid)
      }
    } else if (req.method === 'POST' && (route === '/claim' || route === '/prompts/claim')) {
      const forbidden = requireScope(auth, 'claim', rid, 'claim')
      if (forbidden) {
        resp = forbidden
      } else {
        const raw = await readBody(req, rid)
        if (raw.err) {
          resp = raw.err
        } else {
          const parsed = parseJsonObject(raw.body, rid)
          if (parsed.err) {
            resp = parsed.err
          } else {
            const workerId = getWorkerId(req, parsed.body)
            resp = await handleClaim(supabase, parsed.body, workerId, rid)
          }
        }
      }
    } else if (req.method === 'POST' && (route === '/heartbeat' || route === '/workers/heartbeat')) {
      const forbidden = requireScope(auth, 'heartbeat', rid, 'heartbeat')
      if (forbidden) {
        resp = forbidden
      } else {
        const raw = await readBody(req, rid)
        if (raw.err) {
          resp = raw.err
        } else {
          const parsed = parseJsonObject(raw.body, rid)
          if (parsed.err) {
            resp = parsed.err
          } else {
            const workerId = getWorkerId(req, parsed.body)
            resp = await handleHeartbeat(supabase, parsed.body, workerId, rid)
          }
        }
      }
    } else if (req.method === 'POST' && route === '/worker-tokens') {
      if (auth.kind !== 'service_role') {
        resp = json({ error: 'Forbidden: /worker-tokens requires service-role token' }, 403, { requestId: rid })
      } else {
        const raw = await readBody(req, rid)
        if (raw.err) {
          resp = raw.err
        } else {
          const parsed = parseJsonObject(raw.body, rid)
          if (parsed.err) {
            resp = parsed.err
          } else {
            resp = await handleCreateWorkerToken(supabase, parsed.body, rid)
          }
        }
      }
    } else if (req.method === 'POST' && route === '/prompts/reorder') {
      const raw = await readBody(req, rid)
      if (raw.err) {
        resp = raw.err
      } else {
        const parsed = parseJsonObject(raw.body, rid)
        if (parsed.err) {
          resp = parsed.err
        } else {
          resp = await handleReorderPrioritized(supabase, parsed.body, rid)
        }
      }
    } else if (req.method === 'POST' && promptActionMatch) {
      const id = promptActionMatch[1]
      const action = promptActionMatch[2]
      if (!isValidUUID(id)) {
        resp = json({ error: 'Invalid prompt ID format' }, 400, { requestId: rid })
      } else {
        const raw = await readBody(req, rid)
        if (raw.err) {
          resp = raw.err
        } else {
          const parsed = parseJsonObject(raw.body, rid)
          if (parsed.err) {
            resp = parsed.err
          } else if (action === 'move') {
            resp = await handleMovePrompt(supabase, id, parsed.body, rid)
          } else if (action === 'edit') {
            resp = await handleEditPrompt(supabase, id, parsed.body, rid)
          } else {
            resp = await handleReprocessPrompt(supabase, id, parsed.body, rid)
          }
        }
      }
    } else if (req.method === 'POST' && (route === '/prompts' || route === '/')) {
      const raw = await readBody(req, rid)
      if (raw.err) {
        resp = raw.err
      } else {
        const parsed = parseJsonObject(raw.body, rid)
        if (parsed.err) {
          resp = parsed.err
        } else {
          resp = await handleCreate(supabase, parsed.body as unknown as PromptPayload, rid)
        }
      }
    } else if (req.method === 'PATCH' && promptDetailMatch) {
      const forbidden = requireScope(auth, 'patch', rid, 'patch')
      if (forbidden) {
        resp = forbidden
      } else {
        const id = promptDetailMatch[1]
        if (!isValidUUID(id)) {
          resp = json({ error: 'Invalid prompt ID format' }, 400, { requestId: rid })
        } else {
          const raw = await readBody(req, rid)
          if (raw.err) {
            resp = raw.err
          } else {
            const parsed = parseJsonObject(raw.body, rid)
            if (parsed.err) {
              resp = parsed.err
            } else {
              resp = await handleUpdate(supabase, id, parsed.body, rid)
            }
          }
        }
      }
    } else {
      resp = json({ error: 'Not Found' }, 404, { requestId: rid })
    }
  } catch (err) {
    let message = 'Unexpected error'
    let status = 500

    if (err instanceof Error) {
      message = err.message
    } else if (typeof err === 'object' && err !== null) {
      const errObj = err as Record<string, unknown>
      message = String(errObj.message || errObj.msg || 'Unexpected error')
      const msgLower = message.toLowerCase()
      if (
        msgLower.includes('jwt') ||
        (msgLower.includes('invalid') && msgLower.includes('token')) ||
        msgLower.includes('unauthorized') ||
        msgLower.includes('auth')
      ) {
        status = 401
      }
    }

    log('error', 'unhandled_error', { rid, status, error: message })
    resp = json({ error: message }, status, { requestId: rid })
  }

  const latencyMs = Date.now() - start
  metric('http_request', { rid, method: req.method, route, status: resp.status, latency_ms: latencyMs, auth_kind: auth.kind })
  flushMetrics()

  return resp
})

async function readBody(req: Request, rid: string): Promise<{ body: string | null; err?: Response }> {
  const cl = req.headers.get('content-length')
  if (cl && Number(cl) > MAX_BODY_BYTES) {
    log('warn', 'payload_too_large', { rid, content_length: cl })
    return { body: null, err: json({ error: 'Payload too large' }, 413, { requestId: rid }) }
  }
  const buf = await req.arrayBuffer()
  if (buf.byteLength > MAX_BODY_BYTES) {
    log('warn', 'payload_too_large', { rid, byte_length: buf.byteLength })
    return { body: null, err: json({ error: 'Payload too large' }, 413, { requestId: rid }) }
  }
  const body = new TextDecoder().decode(buf)
  return { body }
}

function parseJsonObject(body: string | null, rid: string): { body: Record<string, unknown>; err?: Response } {
  if (!body || body.trim() === '') return { body: {} }
  try {
    const parsed = JSON.parse(body)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { body: {}, err: json({ error: 'JSON body must be an object' }, 400, { requestId: rid }) }
    }
    return { body: parsed as Record<string, unknown> }
  } catch {
    return { body: {}, err: json({ error: 'Invalid JSON body' }, 400, { requestId: rid }) }
  }
}

function getWorkerId(req: Request, body: Record<string, unknown>): string {
  const fromHeader = (req.headers.get('x-worker-id') ?? '').trim()
  if (fromHeader) return fromHeader
  if (typeof body.worker_id === 'string' && body.worker_id.trim()) return body.worker_id.trim()
  if (typeof body.p_worker_id === 'string' && body.p_worker_id.trim()) return body.p_worker_id.trim()
  return ''
}

function parseLimit(raw: unknown, fallback = DEFAULT_LIMIT): number {
  const parsed = Number(raw)
  const safe = Number.isFinite(parsed) ? Math.floor(parsed) : fallback
  return Math.min(MAX_LIMIT, Math.max(1, safe))
}

async function handleHealth(supabase: any, rid: string) {
  log('info', 'health', { rid })
  const activeCutoffIso = new Date(Date.now() - 5 * 60 * 1000).toISOString()

  const workerResult = await supabase
    .from('nw_worker_heartbeats')
    .select('worker_id, provider, last_seen, status')
    .gte('last_seen', activeCutoffIso)
    .order('last_seen', { ascending: false })

  if (workerResult.error && workerResult.error.code !== '42P01') throw workerResult.error
  const workerRows = workerResult.error ? [] : (workerResult.data ?? [])

  const queueResult = await supabase
    .from('nw_prompts')
    .select('provider, status, queue_stage')
    .in('status', ['pending', 'processing'])

  if (queueResult.error && queueResult.error.code !== '42P01') throw queueResult.error
  const queueRows = queueResult.error ? [] : (queueResult.data ?? [])
  const queueByProvider = new Map<string, number>()
  let pendingTotal = 0
  let pendingPrioritized = 0
  let pendingBacklog = 0
  let processingTotal = 0
  for (const row of queueRows as Array<{ provider: string; status: PromptStatus; queue_stage?: QueueStage }>) {
    queueByProvider.set(row.provider, (queueByProvider.get(row.provider) ?? 0) + 1)
    if (row.status === 'pending') {
      pendingTotal += 1
      if (row.queue_stage === 'prioritized') pendingPrioritized += 1
      else pendingBacklog += 1
    }
    if (row.status === 'processing') processingTotal += 1
  }

  const workers = (workerRows as Array<{ worker_id: string; provider: string; last_seen: string; status: string }>).map((w) => ({
    name: w.worker_id,
    worker_id: w.worker_id,
    provider: w.provider,
    active: w.status !== 'error',
    queue: queueByProvider.get(w.provider) ?? 0,
    lastRun: w.last_seen,
    last_seen: w.last_seen,
    status: w.status,
  }))

  return json(
    {
      status: 'ok',
      version: 'edge',
      providers: [...VALID_PROVIDERS],
      pending: pendingTotal,
      pending_prioritized: pendingPrioritized,
      pending_backlog: pendingBacklog,
      processing: processingTotal,
      workers,
    },
    200,
    { requestId: rid, cache: true }
  )
}

async function handleClaim(supabase: any, body: Record<string, unknown>, workerId: string, rid: string) {
  const providerValue = typeof body.provider === 'string'
    ? body.provider.trim()
    : (typeof body.p_provider === 'string' ? body.p_provider.trim() : '')
  const limitValue = body.limit ?? body.p_limit
  const limit = parseLimit(limitValue, 10)

  if (!providerValue || !VALID_PROVIDERS.has(providerValue)) {
    return json({ error: `Invalid provider. Must be one of: ${[...VALID_PROVIDERS].join(', ')}` }, 400, { requestId: rid })
  }
  if (!workerId) {
    return json({ error: 'worker_id is required (header x-worker-id or body worker_id/p_worker_id)' }, 400, { requestId: rid })
  }

  const { data, error } = await supabase.rpc('claim_prompts', {
    p_provider: providerValue,
    p_worker_id: workerId,
    p_limit: limit,
  })
  if (error) {
    if (error.code === '42883' || error.code === 'PGRST202') {
      return json({ error: 'claim_prompts RPC is not available. Apply latest migrations.' }, 501, { requestId: rid })
    }
    throw error
  }

  const prompts = Array.isArray(data) ? data : []
  log('info', 'claim', { rid, provider: providerValue, worker_id: workerId, limit, claimed: prompts.length })
  metric('prompts_claimed', { rid, provider: providerValue, worker_id: workerId, claimed: prompts.length })
  return json(prompts, 200, { requestId: rid })
}

async function handleHeartbeat(supabase: any, body: Record<string, unknown>, workerId: string, rid: string) {
  const providerValue = typeof body.provider === 'string'
    ? body.provider.trim()
    : (typeof body.p_provider === 'string' ? body.p_provider.trim() : '')
  const statusValue = typeof body.status === 'string' ? body.status.trim() : 'active'

  if (!workerId) {
    return json({ error: 'worker_id is required (header x-worker-id or body worker_id/p_worker_id)' }, 400, { requestId: rid })
  }
  if (!providerValue || !VALID_PROVIDERS.has(providerValue)) {
    return json({ error: `Invalid provider. Must be one of: ${[...VALID_PROVIDERS].join(', ')}` }, 400, { requestId: rid })
  }
  if (!VALID_WORKER_STATUSES.has(statusValue)) {
    return json({ error: `Invalid worker status. Must be one of: ${[...VALID_WORKER_STATUSES].join(', ')}` }, 400, { requestId: rid })
  }

  const payload = {
    worker_id: workerId,
    provider: providerValue,
    status: statusValue,
    last_seen: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('nw_worker_heartbeats')
    .upsert(payload, { onConflict: 'worker_id' })
    .select('worker_id, provider, status, last_seen')
    .single()

  if (error) {
    if (error.code === '42P01') {
      return json({ error: 'nw_worker_heartbeats table not found. Apply latest migrations first.' }, 501, { requestId: rid })
    }
    throw error
  }

  log('info', 'heartbeat', { rid, worker_id: workerId, provider: providerValue, status: statusValue })
  return json({ ok: true, worker: data }, 200, { requestId: rid })
}

async function handleList(supabase: any, url: URL, rid: string) {
  const status = url.searchParams.get('status') ?? undefined
  const provider = url.searchParams.get('provider') ?? undefined
  const queueStage = url.searchParams.get('queue_stage') ?? url.searchParams.get('stage') ?? undefined
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')
  const limitRaw = Number(url.searchParams.get('limit') ?? DEFAULT_LIMIT)
  const offsetRaw = Number(url.searchParams.get('offset') ?? 0)
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : DEFAULT_LIMIT))
  const offset = Math.max(0, Number.isFinite(offsetRaw) ? offsetRaw : 0)

  // Validate filter values
  if (status && !VALID_STATUSES.has(status)) {
    return json({ error: `Invalid status filter. Must be one of: ${[...VALID_STATUSES].join(', ')}` }, 400, { requestId: rid })
  }
  if (provider && !VALID_PROVIDERS.has(provider)) {
    return json({ error: `Invalid provider filter. Must be one of: ${[...VALID_PROVIDERS].join(', ')}` }, 400, { requestId: rid })
  }
  if (queueStage && !VALID_QUEUE_STAGES.has(queueStage)) {
    return json({ error: `Invalid queue_stage filter. Must be one of: ${[...VALID_QUEUE_STAGES].join(', ')}` }, 400, { requestId: rid })
  }

  let query = supabase.from('nw_prompts').select('*', { count: 'exact' }).order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (provider) query = query.eq('provider', provider)
  if (queueStage) query = query.eq('queue_stage', queueStage)
  if (from) query = query.gte('created_at', from)
  if (to) query = query.lte('created_at', to)
  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query
  if (error) throw error
  const total = count ?? data?.length ?? 0
  log('info', 'list', { rid, status: status || 'all', provider: provider || 'all', total, limit, offset })
  return json({ total, prompts: data ?? [] }, 200, { requestId: rid, cache: true })
}

async function handleGet(supabase: any, id: string, rid: string) {
  const { data, error } = await supabase.from('nw_prompts').select('*').eq('id', id).single()
  if (error) {
    if (error.code === 'PGRST116') return json({ error: 'Prompt not found' }, 404, { requestId: rid })
    throw error
  }
  const { data: events } = await supabase
    .from('nw_prompt_events')
    .select('*')
    .eq('prompt_id', id)
    .order('created_at', { ascending: false })
  log('info', 'get', { rid, id, status: data.status })
  return json({ ...data, events: events ?? [] }, 200, { requestId: rid, cache: true })
}

function validateCreate(body: unknown): { ok: true; payload: PromptPayload } | { ok: false; status: number; error: string } {
  const b = body as Record<string, unknown>
  if (!b || typeof b !== 'object') return { ok: false, status: 400, error: 'Body must be a JSON object' }
  const provider = typeof b.provider === 'string' ? b.provider.trim() : ''
  const name = typeof b.name === 'string' ? sanitizeText(b.name.trim()) : ''
  const content = typeof b.content === 'string' ? sanitizeText(b.content) : ''
  if (!provider || !name || !content) return { ok: false, status: 400, error: 'provider, name and content are required' }
  if (!VALID_PROVIDERS.has(provider)) return { ok: false, status: 400, error: `provider must be one of: ${[...VALID_PROVIDERS].join(', ')}` }
  if (name.length > MAX_NAME_LEN) return { ok: false, status: 400, error: `name must be at most ${MAX_NAME_LEN} characters` }
  if (content.length > MAX_CONTENT_LEN) return { ok: false, status: 400, error: `content must be at most ${MAX_CONTENT_LEN} characters` }
  const target_folder = b.target_folder !== undefined
    ? (typeof b.target_folder === 'string' ? sanitizeText(b.target_folder.slice(0, MAX_TARGET_FOLDER_LEN)) : undefined)
    : undefined

  let queue_stage: QueueStage | undefined = undefined
  if (b.queue_stage !== undefined) {
    if (typeof b.queue_stage !== 'string' || !VALID_QUEUE_STAGES.has(b.queue_stage)) {
      return { ok: false, status: 400, error: `queue_stage must be one of: ${[...VALID_QUEUE_STAGES].join(', ')}` }
    }
    queue_stage = b.queue_stage as QueueStage
  }

  let priority_order: number | null | undefined = undefined
  if (b.priority_order !== undefined && b.priority_order !== null) {
    const parsedOrder = Number(b.priority_order)
    if (!Number.isFinite(parsedOrder) || parsedOrder < 1) {
      return { ok: false, status: 400, error: 'priority_order must be a positive integer' }
    }
    priority_order = Math.floor(parsedOrder)
  } else if (b.priority_order === null) {
    priority_order = null
  }

  return { ok: true, payload: { provider: provider as Provider, name, content, target_folder, queue_stage, priority_order } }
}

async function nextPriorityOrder(supabase: any, provider: string): Promise<number> {
  const { data, error } = await supabase
    .from('nw_prompts')
    .select('priority_order')
    .eq('provider', provider)
    .eq('status', 'pending')
    .eq('queue_stage', 'prioritized')
    .order('priority_order', { ascending: false, nullsFirst: false })
    .limit(1)
  if (error) throw error

  const current = Number(data?.[0]?.priority_order ?? 0)
  if (!Number.isFinite(current) || current < 0) return 1
  return Math.floor(current) + 1
}

async function handleCreate(supabase: any, body: PromptPayload, rid: string) {
  const validated = validateCreate(body)
  if (!validated.ok) return json({ error: validated.error }, validated.status, { requestId: rid })
  const { name, provider, content, target_folder } = validated.payload

  const queueStage: QueueStage = validated.payload.queue_stage ?? 'backlog'
  let priorityOrder = validated.payload.priority_order
  if (queueStage === 'prioritized' && (priorityOrder === undefined || priorityOrder === null)) {
    priorityOrder = await nextPriorityOrder(supabase, provider)
  }
  if (queueStage === 'backlog') {
    priorityOrder = null
  }

  const { data, error } = await supabase
    .from('nw_prompts')
    .insert({ name, provider, content, target_folder, status: 'pending', queue_stage: queueStage, priority_order: priorityOrder })
    .select()
    .single()
  if (error) throw error
  log('info', 'created', { rid, id: data.id, provider, name })
  metric('prompt_created', { rid, provider, queue_stage: queueStage })
  return json({ id: data.id }, 201, { requestId: rid })
}

async function handleMovePrompt(supabase: any, id: string, body: Record<string, unknown>, rid: string) {
  const stageRaw = typeof body.stage === 'string'
    ? body.stage.trim()
    : (typeof body.queue_stage === 'string' ? body.queue_stage.trim() : '')
  if (!VALID_QUEUE_STAGES.has(stageRaw)) {
    return json({ error: `Invalid stage. Must be one of: ${[...VALID_QUEUE_STAGES].join(', ')}` }, 400, { requestId: rid })
  }
  const stage = stageRaw as QueueStage

  const { data: existing, error: fetchError } = await supabase
    .from('nw_prompts')
    .select('id, provider, status')
    .eq('id', id)
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') return json({ error: 'Prompt not found' }, 404, { requestId: rid })
    throw fetchError
  }
  if (existing.status !== 'pending') {
    return json({ error: 'Only pending prompts can move between backlog and prioritized' }, 409, { requestId: rid })
  }

  let priorityOrder: number | null = null
  if (stage === 'prioritized') {
    const requestedOrder = body.priority_order
    if (requestedOrder !== undefined && requestedOrder !== null) {
      const parsed = Number(requestedOrder)
      if (!Number.isFinite(parsed) || parsed < 1) {
        return json({ error: 'priority_order must be a positive integer' }, 400, { requestId: rid })
      }
      priorityOrder = Math.floor(parsed)
    } else {
      priorityOrder = await nextPriorityOrder(supabase, existing.provider)
    }
  }

  const { data, error } = await supabase
    .from('nw_prompts')
    .update({ queue_stage: stage, priority_order: priorityOrder })
    .eq('id', id)
    .eq('status', 'pending')
    .select('id, status, queue_stage, priority_order')
    .single()

  if (error) throw error
  return json(data, 200, { requestId: rid })
}

async function handleReorderPrioritized(supabase: any, body: Record<string, unknown>, rid: string) {
  const idsRaw = Array.isArray(body.ids)
    ? body.ids
    : Array.isArray(body.prompt_ids)
      ? body.prompt_ids
      : Array.isArray(body.ordered_ids)
        ? body.ordered_ids
        : null

  if (!idsRaw) {
    return json({ error: 'ids (uuid[]) is required' }, 400, { requestId: rid })
  }

  const ids = idsRaw.map((id) => String(id).trim())
  if (ids.some((id) => !isValidUUID(id))) {
    return json({ error: 'All ids must be valid UUIDs' }, 400, { requestId: rid })
  }
  if (new Set(ids).size !== ids.length) {
    return json({ error: 'ids must not contain duplicates' }, 400, { requestId: rid })
  }

  const { data, error } = await supabase.rpc('reorder_prioritized_prompts', { p_ids: ids })
  if (error) {
    if (error.code === '42883' || error.code === 'PGRST202') {
      return json({ error: 'reorder_prioritized_prompts RPC is not available. Apply latest migrations.' }, 501, { requestId: rid })
    }
    throw error
  }

  return json({ updated: Number(data ?? 0), requested: ids.length }, 200, { requestId: rid })
}

async function handleEditPrompt(supabase: any, id: string, body: Record<string, unknown>, rid: string) {
  const { data: existing, error: fetchError } = await supabase
    .from('nw_prompts')
    .select('id, status')
    .eq('id', id)
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') return json({ error: 'Prompt not found' }, 404, { requestId: rid })
    throw fetchError
  }
  if (existing.status !== 'pending') {
    return json({ error: 'Editing is allowed only when status is pending' }, 409, { requestId: rid })
  }

  const allowed: Record<string, unknown> = {}

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return json({ error: 'name must be a non-empty string' }, 400, { requestId: rid })
    }
    const safeName = sanitizeText(body.name.trim())
    if (safeName.length > MAX_NAME_LEN) {
      return json({ error: `name must be at most ${MAX_NAME_LEN} characters` }, 400, { requestId: rid })
    }
    allowed.name = safeName
  }

  if (body.content !== undefined) {
    if (typeof body.content !== 'string' || !body.content.trim()) {
      return json({ error: 'content must be a non-empty string' }, 400, { requestId: rid })
    }
    const safeContent = sanitizeText(body.content)
    if (safeContent.length > MAX_CONTENT_LEN) {
      return json({ error: `content must be at most ${MAX_CONTENT_LEN} characters` }, 400, { requestId: rid })
    }
    allowed.content = safeContent
  }

  if (body.target_folder !== undefined) {
    if (body.target_folder === null || body.target_folder === '') {
      allowed.target_folder = null
    } else if (typeof body.target_folder === 'string') {
      allowed.target_folder = sanitizeText(body.target_folder.slice(0, MAX_TARGET_FOLDER_LEN))
    } else {
      return json({ error: 'target_folder must be string or null' }, 400, { requestId: rid })
    }
  }

  if (Object.keys(allowed).length === 0) {
    return json({ error: 'No editable fields provided (name/content/target_folder)' }, 400, { requestId: rid })
  }

  const { data, error } = await supabase
    .from('nw_prompts')
    .update(allowed)
    .eq('id', id)
    .eq('status', 'pending')
    .select('id, status, name, target_folder, updated_at')
    .single()
  if (error) throw error

  await supabase.from('nw_prompt_events').insert({
    prompt_id: id,
    type: 'edit',
    message: 'Prompt edited from kanban',
  })

  return json(data, 200, { requestId: rid })
}

async function handleReprocessPrompt(supabase: any, id: string, body: Record<string, unknown>, rid: string) {
  const { data: source, error: sourceError } = await supabase
    .from('nw_prompts')
    .select('id, name, provider, content, target_folder, status')
    .eq('id', id)
    .single()
  if (sourceError) {
    if (sourceError.code === 'PGRST116') return json({ error: 'Prompt not found' }, 404, { requestId: rid })
    throw sourceError
  }

  if (source.status !== 'done' && source.status !== 'failed') {
    return json({ error: 'Reprocess is allowed only for done/failed prompts' }, 409, { requestId: rid })
  }
  if (!source.content || !String(source.content).trim()) {
    return json({ error: 'Cannot reprocess prompt without content' }, 409, { requestId: rid })
  }

  const cloneName = typeof body.name === 'string' && body.name.trim()
    ? sanitizeText(body.name.trim().slice(0, MAX_NAME_LEN))
    : `${source.name}-retry`

  const priorityOrder = await nextPriorityOrder(supabase, source.provider)
  const { data: clone, error: insertError } = await supabase
    .from('nw_prompts')
    .insert({
      name: cloneName,
      provider: source.provider,
      content: source.content,
      target_folder: source.target_folder,
      status: 'pending',
      queue_stage: 'prioritized',
      priority_order: priorityOrder,
      cloned_from: source.id,
      attempts: 0,
      next_retry_at: null,
      result_path: null,
      result_content: null,
      error: null,
      worker_id: null,
      processing_started_at: null,
    })
    .select('id, status, queue_stage, cloned_from')
    .single()

  if (insertError) throw insertError

  await supabase.from('nw_prompt_events').insert([
    { prompt_id: source.id, type: 'reprocess_requested', message: `Created clone ${clone.id}` },
    { prompt_id: clone.id, type: 'reprocessed', message: `Cloned from ${source.id}` },
  ])

  return json(clone, 201, { requestId: rid })
}

async function handleCreateWorkerToken(supabase: any, body: Record<string, unknown>, rid: string) {
  const workerName = typeof body.worker_name === 'string' ? sanitizeText(body.worker_name.trim()) : ''
  if (!workerName) {
    return json({ error: 'worker_name is required' }, 400, { requestId: rid })
  }

  const rawScopes = Array.isArray(body.scopes) && body.scopes.length > 0 ? body.scopes : ['claim', 'patch', 'heartbeat']
  const scopes = rawScopes.map((s) => String(s).trim())
  if (scopes.some((scope) => !WORKER_TOKEN_SCOPES.has(scope))) {
    return json({ error: `scopes must be subset of: ${[...WORKER_TOKEN_SCOPES].join(', ')}` }, 400, { requestId: rid })
  }

  const expiresInHoursRaw = Number(body.expires_in_hours ?? 24 * 30)
  const expiresInHours = Number.isFinite(expiresInHoursRaw) && expiresInHoursRaw > 0 ? Math.floor(expiresInHoursRaw) : null
  const expiresAt = expiresInHours ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString() : null

  const rawToken = `nwk_${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`
  const tokenHash = await sha256Hex(rawToken)
  const notes = typeof body.notes === 'string' ? sanitizeText(body.notes.slice(0, 2000)) : null

  const { data, error } = await supabase
    .from('nw_worker_tokens')
    .insert({
      worker_name: workerName,
      token_hash: tokenHash,
      scopes,
      expires_at: expiresAt,
      notes,
    })
    .select('id, worker_name, scopes, created_at, expires_at')
    .single()

  if (error) {
    if (error.code === '42P01') {
      return json({ error: 'nw_worker_tokens table not found. Apply latest migrations first.' }, 501, { requestId: rid })
    }
    throw error
  }

  return json(
    {
      id: data.id,
      worker_name: data.worker_name,
      scopes: data.scopes,
      created_at: data.created_at,
      expires_at: data.expires_at,
      token: rawToken,
    },
    201,
    { requestId: rid }
  )
}

function validatePatch(
  body: Record<string, unknown>
): { allowed: Record<string, unknown>; statusTransition?: 'done' | 'failed'; error?: string } {
  const allowed: Record<string, unknown> = {}
  if (body.status !== undefined) {
    const s = String(body.status)
    if (!VALID_STATUSES.has(s)) return { allowed: {}, error: `status must be one of: ${[...VALID_STATUSES].join(', ')}` }
    allowed.status = s
    if (s === 'done' || s === 'failed') (allowed as any)._statusTransition = s
    if (s === 'pending') {
      allowed.worker_id = null
      allowed.processing_started_at = null
    }
  }
  if (body.queue_stage !== undefined) {
    const stage = String(body.queue_stage)
    if (!VALID_QUEUE_STAGES.has(stage)) {
      return { allowed: {}, error: `queue_stage must be one of: ${[...VALID_QUEUE_STAGES].join(', ')}` }
    }
    allowed.queue_stage = stage
    if (stage === 'backlog') allowed.priority_order = null
  }
  if (body.priority_order !== undefined) {
    if (body.priority_order === null) {
      allowed.priority_order = null
    } else {
      const parsed = Number(body.priority_order)
      if (!Number.isFinite(parsed) || parsed < 1) return { allowed: {}, error: 'priority_order must be a positive integer or null' }
      allowed.priority_order = Math.floor(parsed)
    }
  }
  if (body.result_path !== undefined) allowed.result_path = typeof body.result_path === 'string' ? sanitizeText(body.result_path.slice(0, 5000)) : body.result_path
  if (body.result_content !== undefined) allowed.result_content = typeof body.result_content === 'string' ? body.result_content.slice(0, MAX_CONTENT_LEN) : body.result_content
  if (body.error !== undefined) allowed.error = typeof body.error === 'string' ? sanitizeText(body.error.slice(0, 5000)) : body.error
  if (body.attempts !== undefined) {
    const a = Number(body.attempts)
    allowed.attempts = Number.isFinite(a) && a >= 0 ? Math.floor(a) : 0
  }
  if (body.next_retry_at !== undefined) {
    if (body.next_retry_at === null) allowed.next_retry_at = null
    else if (typeof body.next_retry_at === 'string') allowed.next_retry_at = body.next_retry_at
    else return { allowed: {}, error: 'next_retry_at must be ISO string or null' }
  }
  if (body.content !== undefined) {
    if (typeof body.content !== 'string') return { allowed: {}, error: 'content must be string' }
    allowed.content = body.content.slice(0, MAX_CONTENT_LEN)
  }
  if (body.target_folder !== undefined) {
    if (body.target_folder === null) allowed.target_folder = null
    else if (typeof body.target_folder === 'string') {
      allowed.target_folder = sanitizeText(body.target_folder.slice(0, MAX_TARGET_FOLDER_LEN))
    } else {
      return { allowed: {}, error: 'target_folder must be string or null' }
    }
  }
  const statusTransition = (allowed as any)._statusTransition
  delete (allowed as any)._statusTransition
  return { allowed, statusTransition }
}

async function handleUpdate(supabase: any, id: string, body: Record<string, unknown>, rid: string) {
  const { allowed, statusTransition, error } = validatePatch(body)
  if (error) {
    return json({ error }, 400, { requestId: rid })
  }
  if (statusTransition) {
    allowed.worker_id = null
    allowed.processing_started_at = null
  }
  if (Object.keys(allowed).length === 0 && !body.event_type && body.event_message === undefined) {
    return json({ error: 'No valid fields to update' }, 400, { requestId: rid })
  }

  // Only apply DB update if there are column-level changes
  let data: any = null
  if (Object.keys(allowed).length > 0) {
    let query = supabase.from('nw_prompts').update(allowed).eq('id', id)
    // Idempotency: terminal transitions only apply while prompt is not already terminal.
    if (statusTransition) query = query.in('status', ['pending', 'processing'])

    const result = await query.select().single()
    if (result.error) {
      if (result.error.code === 'PGRST116') {
        // If this was a status transition, check if it's already in the target state (idempotent)
        if (statusTransition) {
          const { data: existing } = await supabase.from('nw_prompts').select('id, status').eq('id', id).single()
          if (existing && existing.status === statusTransition) {
            log('info', 'patch_idempotent', { rid, id, status: statusTransition })
            return json({ id: existing.id, status: existing.status, idempotent: true }, 200, { requestId: rid })
          }
          log('warn', 'patch_conflict', { rid, id, current_status: existing?.status, requested: statusTransition })
          return json({ error: 'Prompt already processed or not found', current_status: existing?.status }, 409, { requestId: rid })
        }
        return json({ error: 'Prompt not found' }, 404, { requestId: rid })
      }
      log('error', 'patch_db_error', { rid, id, error: result.error.message, code: result.error.code })
      throw result.error
    }
    data = result.data
  } else {
    // No column changes, but we may still insert an event. Fetch current state.
    const { data: existing, error } = await supabase.from('nw_prompts').select('id, status').eq('id', id).single()
    if (error) {
      if (error.code === 'PGRST116') return json({ error: 'Prompt not found' }, 404, { requestId: rid })
      throw error
    }
    data = existing
  }

  log('info', 'patch_ok', { rid, id, status: data?.status })
  metric('prompt_updated', { rid, id, status: data?.status })

  // Record event
  if (body.event_type || body.event_message !== undefined) {
    const eventType = String(body.event_type ?? 'update')
    await supabase.from('nw_prompt_events').insert({
      prompt_id: id,
      type: sanitizeText(eventType),
      message: body.event_message != null ? sanitizeText(String(body.event_message).slice(0, 5000)) : null,
    })
  }

  return json({ id: data.id, status: data.status }, 200, { requestId: rid })
}

function json(payload: unknown, status = 200, opts?: { requestId?: string; cache?: boolean }) {
  const headers = opts?.requestId ? respHeaders(opts.requestId, opts.cache) : { ...corsHeaders }
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}
