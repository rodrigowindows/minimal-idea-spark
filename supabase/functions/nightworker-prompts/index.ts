import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
}

const MAX_BODY_BYTES = 1024 * 1024 // 1 MB
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100
const CACHE_MAX_AGE = 5 // seconds

const VALID_PROVIDERS = new Set(['codex', 'claude', 'codex_cli', 'claude_cli', 'openai_api', 'gemini'])
const VALID_STATUSES = new Set(['pending', 'done', 'failed'])
const MAX_NAME_LEN = 500
const MAX_CONTENT_LEN = 500_000
const MAX_TARGET_FOLDER_LEN = 2000

type PromptStatus = 'pending' | 'done' | 'failed'
type Provider = 'codex' | 'claude' | 'codex_cli' | 'claude_cli' | 'openai_api' | 'gemini'

interface PromptPayload {
  provider: Provider
  name: string
  content: string
  target_folder?: string
}

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

// --- PATCH authorization: only service-role may update prompts (worker contract) ---
function isServiceRole(req: Request): boolean {
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!serviceKey) return false
  const auth = req.headers.get('Authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  return token.length > 0 && token === serviceKey
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

  log('info', 'request', { rid, method: req.method, route })

  // Use service-role key directly for all operations (no user auth required)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  let resp: Response
  try {
    if (req.method === 'GET' && route === '/health') {
      resp = handleHealth(rid)
    } else if (req.method === 'GET' && (route === '/' || route === '/prompts')) {
      resp = await handleList(supabase, url, rid)
    } else if (req.method === 'GET' && route.startsWith('/prompts/')) {
      const id = route.split('/')[2]
      if (!isValidUUID(id)) {
        resp = json({ error: 'Invalid prompt ID format' }, 400, { requestId: rid })
      } else {
        resp = await handleGet(supabase, id, rid)
      }
    } else if (req.method === 'POST' && (route === '/prompts' || route === '/')) {
      const raw = await readBody(req, rid)
      if (raw.err) { resp = raw.err } else {
        let body: PromptPayload
        try {
          body = JSON.parse(raw.body!) as PromptPayload
        } catch {
          resp = json({ error: 'Invalid JSON body' }, 400, { requestId: rid })
          body = undefined as any
        }
        if (body) resp = await handleCreate(supabase, body, rid)
        else resp = resp!
      }
    } else if (req.method === 'PATCH' && route.startsWith('/prompts/')) {
      if (!isServiceRole(req)) {
        log('warn', 'patch_forbidden', { rid, msg: 'PATCH requires Bearer service-role' })
        resp = json({ error: 'Forbidden: PATCH is allowed only with service-role token' }, 403, { requestId: rid })
      } else {
        const id = route.split('/')[2]
        if (!isValidUUID(id)) {
          resp = json({ error: 'Invalid prompt ID format' }, 400, { requestId: rid })
        } else {
          const raw = await readBody(req, rid)
        if (raw.err) { resp = raw.err } else {
          let body: Record<string, unknown>
          try {
            body = JSON.parse(raw.body!) as Record<string, unknown>
          } catch {
            resp = json({ error: 'Invalid JSON body' }, 400, { requestId: rid })
            body = undefined as any
          }
          if (body) resp = await handleUpdate(supabase, id, body, rid)
          else resp = resp!
        }
        }
      }
    } else {
      resp = json({ error: 'Not Found' }, 404, { requestId: rid })
    }
  } catch (err) {
    // Enhanced error handling: extract message from Error or object with message property
    let message = 'Unexpected error'
    let status = 500

    if (err instanceof Error) {
      message = err.message
    } else if (typeof err === 'object' && err !== null) {
      const errObj = err as Record<string, unknown>
      message = String(errObj.message || errObj.msg || 'Unexpected error')

      // Map common Supabase auth errors to 401
      const msgLower = message.toLowerCase()
      if (msgLower.includes('jwt') || msgLower.includes('invalid') && msgLower.includes('token')
          || msgLower.includes('unauthorized') || msgLower.includes('auth')) {
        status = 401
        log('warn', 'auth_error', { rid, error: message, errorObject: JSON.stringify(err).slice(0, 500) })
      } else {
        log('error', 'unhandled_error', { rid, error: message, errorObject: JSON.stringify(err).slice(0, 500) })
      }
    } else {
      log('error', 'unhandled_error', { rid, error: message, rawError: String(err) })
    }

    resp = json({ error: message }, status, { requestId: rid })
  }

  // --- Observability: emit request metric ---
  const latencyMs = Date.now() - start
  const status = resp!.status
  metric('http_request', { rid, method: req.method, route, status, latency_ms: latencyMs })
  flushMetrics()

  return resp!
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

function handleHealth(rid: string) {
  log('info', 'health', { rid })
  return json(
    {
      status: 'ok',
      version: 'edge',
      providers: [...VALID_PROVIDERS],
      workers: [],
    },
    200,
    { requestId: rid, cache: true }
  )
}

async function handleList(supabase: any, url: URL, rid: string) {
  const status = url.searchParams.get('status') ?? undefined
  const provider = url.searchParams.get('provider') ?? undefined
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

  let query = supabase.from('nw_prompts').select('*', { count: 'exact' }).order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (provider) query = query.eq('provider', provider)
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
  return { ok: true, payload: { provider: provider as Provider, name, content, target_folder } }
}

async function handleCreate(supabase: any, body: PromptPayload, rid: string) {
  const validated = validateCreate(body)
  if (!validated.ok) return json({ error: validated.error }, validated.status, { requestId: rid })
  const { name, provider, content, target_folder } = validated.payload
  const { data, error } = await supabase
    .from('nw_prompts')
    .insert({ name, provider, content, target_folder, status: 'pending' })
    .select()
    .single()
  if (error) throw error
  log('info', 'created', { rid, id: data.id, provider, name })
  metric('prompt_created', { rid, provider })
  return json({ id: data.id }, 201, { requestId: rid })
}

function validatePatch(body: Record<string, unknown>): { allowed: Record<string, unknown>; statusTransition?: 'done' | 'failed' } {
  const allowed: Record<string, unknown> = {}
  if (body.status !== undefined) {
    const s = String(body.status)
    if (!VALID_STATUSES.has(s)) return { allowed: {} }
    allowed.status = s
    if (s === 'done' || s === 'failed') (allowed as any)._statusTransition = s
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
  }
  if (body.content !== undefined) allowed.content = typeof body.content === 'string' ? body.content.slice(0, MAX_CONTENT_LEN) : body.content
  if (body.target_folder !== undefined) allowed.target_folder = typeof body.target_folder === 'string' ? sanitizeText(body.target_folder.slice(0, MAX_TARGET_FOLDER_LEN)) : body.target_folder
  const statusTransition = (allowed as any)._statusTransition
  delete (allowed as any)._statusTransition
  return { allowed, statusTransition }
}

async function handleUpdate(supabase: any, id: string, body: Record<string, unknown>, rid: string) {
  const { allowed, statusTransition } = validatePatch(body)
  if (Object.keys(allowed).length === 0 && !body.event_type && body.event_message === undefined) {
    return json({ error: 'No valid fields to update' }, 400, { requestId: rid })
  }

  // Only apply DB update if there are column-level changes
  let data: any = null
  if (Object.keys(allowed).length > 0) {
    let query = supabase.from('nw_prompts').update(allowed).eq('id', id)
    // Idempotency: status transitions only apply to pending prompts
    if (statusTransition) query = query.eq('status', 'pending')

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
    // No column changes, but we may still insert an event — fetch current state
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
