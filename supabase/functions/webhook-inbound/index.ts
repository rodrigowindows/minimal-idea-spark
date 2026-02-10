/**
 * Inbound Webhook Edge Function
 * Receives data from external services (Zapier, Make, etc.) to create items.
 * Auth: via API key in Authorization header or x-api-key header.
 *
 * POST /webhook-inbound
 * Headers: Authorization: Bearer lsk_... or x-api-key: lsk_...
 * Body: { type: "opportunity"|"journal", data: {...} }
 *   or:  { items: [ { type, data }, ... ] }   (batch)
 */

import { corsHeaders } from '../_shared/cors.ts'
import { getSupabaseAdmin } from '../_shared/supabase.ts'

interface InboundItem {
  type: 'opportunity' | 'journal'
  data: Record<string, unknown>
}

interface InboundBody {
  type?: string
  data?: Record<string, unknown>
  items?: InboundItem[]
}

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(key))
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function extractApiKey(req: Request): string | null {
  const authHeader = req.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7)
  return req.headers.get('x-api-key')
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

  // Extract and validate API key
  const apiKey = extractApiKey(req)
  if (!apiKey) {
    return jsonResponse({ error: 'API key required. Use Authorization: Bearer <key> or x-api-key header.' }, 401)
  }

  const keyHash = await hashKey(apiKey)
  const { data: keyData, error: keyError } = await supabase
    .from('api_keys')
    .select('id, user_id, scopes')
    .eq('key_hash', keyHash)
    .is('revoked_at', null)
    .single()

  if (keyError || !keyData) {
    return jsonResponse({ error: 'Invalid or revoked API key' }, 401)
  }

  const scopes: string[] = keyData.scopes ?? []
  if (!scopes.includes('write')) {
    return jsonResponse({ error: 'API key requires "write" scope' }, 403)
  }

  // Parse body
  let body: InboundBody
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  // Normalize to items array
  const items: InboundItem[] = body.items ?? (body.type && body.data ? [{ type: body.type as InboundItem['type'], data: body.data }] : [])

  if (items.length === 0) {
    return jsonResponse({ error: 'No items to process. Provide { type, data } or { items: [...] }' }, 400)
  }

  const results: { index: number; type: string; success: boolean; id?: string; error?: string }[] = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]

    if (item.type === 'opportunity') {
      const { data: opp, error } = await supabase
        .from('opportunities')
        .insert({
          title: item.data.title ?? 'Untitled',
          ...item.data,
          user_id: keyData.user_id,
          status: item.data.status ?? 'backlog',
        })
        .select('id')
        .single()

      results.push({
        index: i,
        type: 'opportunity',
        success: !error,
        id: opp?.id,
        error: error?.message,
      })
    } else if (item.type === 'journal') {
      const { data: entry, error } = await supabase
        .from('daily_logs')
        .insert({
          content: item.data.content ?? '',
          ...item.data,
          user_id: keyData.user_id,
        })
        .select('id')
        .single()

      results.push({
        index: i,
        type: 'journal',
        success: !error,
        id: entry?.id,
        error: error?.message,
      })
    } else {
      results.push({ index: i, type: item.type ?? 'unknown', success: false, error: `Unknown type: ${item.type}` })
    }
  }

  // Log usage
  await supabase.from('api_usage_logs').insert({
    api_key_id: keyData.id,
    method: 'POST',
    path: '/webhook-inbound',
    status_code: 200,
    ip_address: req.headers.get('x-forwarded-for') ?? 'unknown',
    user_agent: req.headers.get('user-agent') ?? '',
  })

  // Update last_used_at
  await supabase.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', keyData.id)

  const successCount = results.filter((r) => r.success).length
  return jsonResponse({
    processed: results.length,
    success: successCount,
    failed: results.length - successCount,
    results,
  }, successCount > 0 ? 201 : 400)
})
