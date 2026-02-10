/**
 * API Auth Edge Function
 * Validates API keys, enforces rate limits, and routes API requests.
 * Endpoints:
 *   POST /api-auth { action: "validate", api_key: "lsk_..." }
 *   POST /api-auth { action: "opportunities", method: "GET"|"POST", api_key: "...", data?: {...} }
 *   POST /api-auth { action: "journal", method: "GET"|"POST", api_key: "...", data?: {...} }
 *   POST /api-auth { action: "import", api_key: "...", items: [...] }
 */

import { corsHeaders } from '../_shared/cors.ts'
import { getSupabaseAdmin } from '../_shared/supabase.ts'

const RATE_LIMIT_PER_MINUTE = 60

interface RequestBody {
  action: string
  api_key: string
  method?: string
  data?: Record<string, unknown>
  items?: Record<string, unknown>[]
  // query params
  status?: string
  limit?: number
  offset?: number
}

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(key))
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function validateApiKey(supabase: ReturnType<typeof getSupabaseAdmin>, apiKey: string) {
  const keyHash = await hashKey(apiKey)

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, user_id, scopes, expires_at, revoked_at')
    .eq('key_hash', keyHash)
    .is('revoked_at', null)
    .single()

  if (error || !data) return null

  // Check expiry
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null

  return data
}

async function checkRateLimit(supabase: ReturnType<typeof getSupabaseAdmin>, apiKeyId: string): Promise<boolean> {
  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString()

  const { count } = await supabase
    .from('api_usage_logs')
    .select('id', { count: 'exact', head: true })
    .eq('api_key_id', apiKeyId)
    .gte('created_at', oneMinuteAgo)

  return (count ?? 0) < RATE_LIMIT_PER_MINUTE
}

async function logUsage(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  apiKeyId: string,
  method: string,
  path: string,
  statusCode: number,
  req: Request,
) {
  await supabase.from('api_usage_logs').insert({
    api_key_id: apiKeyId,
    method,
    path,
    status_code: statusCode,
    ip_address: req.headers.get('x-forwarded-for') ?? req.headers.get('cf-connecting-ip') ?? 'unknown',
    user_agent: req.headers.get('user-agent') ?? '',
  })

  // Update last_used_at on the key
  await supabase.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', apiKeyId)
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = getSupabaseAdmin()

  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  if (!body.api_key) {
    return jsonResponse({ error: 'api_key is required' }, 401)
  }

  // Validate API key
  const keyData = await validateApiKey(supabase, body.api_key)
  if (!keyData) {
    return jsonResponse({ error: 'Invalid or revoked API key' }, 401)
  }

  // Rate limit check
  const withinLimit = await checkRateLimit(supabase, keyData.id)
  if (!withinLimit) {
    await logUsage(supabase, keyData.id, body.method ?? 'POST', body.action, 429, req)
    return jsonResponse({ error: 'Rate limit exceeded. Max 60 requests per minute.' }, 429)
  }

  const scopes: string[] = keyData.scopes ?? ['read', 'write']

  try {
    switch (body.action) {
      case 'validate': {
        await logUsage(supabase, keyData.id, 'POST', '/validate', 200, req)
        return jsonResponse({ ok: true, user_id: keyData.user_id, scopes })
      }

      case 'opportunities': {
        const method = (body.method ?? 'GET').toUpperCase()

        if (method === 'GET') {
          if (!scopes.includes('read')) {
            await logUsage(supabase, keyData.id, 'GET', '/opportunities', 403, req)
            return jsonResponse({ error: 'Insufficient scope: read required' }, 403)
          }
          let query = supabase
            .from('opportunities')
            .select('*')
            .eq('user_id', keyData.user_id)
            .order('created_at', { ascending: false })
            .limit(body.limit ?? 50)

          if (body.status) query = query.eq('status', body.status)
          if (body.offset) query = query.range(body.offset, (body.offset ?? 0) + (body.limit ?? 50) - 1)

          const { data, error } = await query
          const status = error ? 500 : 200
          await logUsage(supabase, keyData.id, 'GET', '/opportunities', status, req)
          if (error) return jsonResponse({ error: error.message }, 500)
          return jsonResponse({ data, count: data?.length ?? 0 })
        }

        if (method === 'POST') {
          if (!scopes.includes('write')) {
            await logUsage(supabase, keyData.id, 'POST', '/opportunities', 403, req)
            return jsonResponse({ error: 'Insufficient scope: write required' }, 403)
          }
          const { data: opp, error } = await supabase
            .from('opportunities')
            .insert({ ...body.data, user_id: keyData.user_id })
            .select()
            .single()

          const status = error ? 500 : 201
          await logUsage(supabase, keyData.id, 'POST', '/opportunities', status, req)
          if (error) return jsonResponse({ error: error.message }, 500)
          return jsonResponse({ data: opp }, 201)
        }

        return jsonResponse({ error: `Unsupported method: ${method}` }, 405)
      }

      case 'journal': {
        const method = (body.method ?? 'GET').toUpperCase()

        if (method === 'GET') {
          if (!scopes.includes('read')) {
            await logUsage(supabase, keyData.id, 'GET', '/journal', 403, req)
            return jsonResponse({ error: 'Insufficient scope: read required' }, 403)
          }
          const { data, error } = await supabase
            .from('daily_logs')
            .select('*')
            .eq('user_id', keyData.user_id)
            .order('created_at', { ascending: false })
            .limit(body.limit ?? 50)

          const status = error ? 500 : 200
          await logUsage(supabase, keyData.id, 'GET', '/journal', status, req)
          if (error) return jsonResponse({ error: error.message }, 500)
          return jsonResponse({ data, count: data?.length ?? 0 })
        }

        if (method === 'POST') {
          if (!scopes.includes('write')) {
            await logUsage(supabase, keyData.id, 'POST', '/journal', 403, req)
            return jsonResponse({ error: 'Insufficient scope: write required' }, 403)
          }
          const { data: entry, error } = await supabase
            .from('daily_logs')
            .insert({ ...body.data, user_id: keyData.user_id })
            .select()
            .single()

          const status = error ? 500 : 201
          await logUsage(supabase, keyData.id, 'POST', '/journal', status, req)
          if (error) return jsonResponse({ error: error.message }, 500)
          return jsonResponse({ data: entry }, 201)
        }

        return jsonResponse({ error: `Unsupported method: ${method}` }, 405)
      }

      case 'import': {
        if (!scopes.includes('write')) {
          await logUsage(supabase, keyData.id, 'POST', '/import', 403, req)
          return jsonResponse({ error: 'Insufficient scope: write required' }, 403)
        }
        if (!Array.isArray(body.items) || body.items.length === 0) {
          await logUsage(supabase, keyData.id, 'POST', '/import', 400, req)
          return jsonResponse({ error: 'items array is required' }, 400)
        }

        const rows = body.items.map((item) => ({
          ...item,
          user_id: keyData.user_id,
          status: item.status ?? 'backlog',
        }))

        const { data, error } = await supabase
          .from('opportunities')
          .insert(rows)
          .select('id')

        const status = error ? 500 : 201
        await logUsage(supabase, keyData.id, 'POST', '/import', status, req)
        if (error) return jsonResponse({ error: error.message }, 500)
        return jsonResponse({ imported: data?.length ?? 0, total: rows.length }, 201)
      }

      default:
        await logUsage(supabase, keyData.id, 'POST', body.action, 404, req)
        return jsonResponse({ error: `Unknown action: ${body.action}` }, 404)
    }
  } catch (e) {
    await logUsage(supabase, keyData.id, body.method ?? 'POST', body.action, 500, req).catch(() => {})
    return jsonResponse({ error: String(e) }, 500)
  }
})
