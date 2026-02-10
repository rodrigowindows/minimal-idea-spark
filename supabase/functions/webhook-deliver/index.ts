/**
 * Webhook Delivery Edge Function
 * Fetches matching webhook endpoints and delivers event payloads.
 * Retries up to 3 times on failure with exponential backoff.
 */

import { corsHeaders } from '../_shared/cors.ts'
import { getSupabaseClient, getSupabaseAdmin } from '../_shared/supabase.ts'

interface DeliverBody {
  event: string
  payload: Record<string, unknown>
}

function sign(secret: string, body: string): Promise<string> {
  const encoder = new TextEncoder()
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  ).then(async (key) => {
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
    return Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  })
}

async function deliverToEndpoint(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  webhookId: string,
  url: string,
  secret: string,
  event: string,
  payload: Record<string, unknown>,
  maxAttempts = 3,
) {
  const bodyStr = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() })

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let responseStatus: number | null = null
    let responseBody: string | null = null
    let success = false

    try {
      const signature = await sign(secret, bodyStr)

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-LifeOS-Signature': `sha256=${signature}`,
          'X-LifeOS-Event': event,
          'X-LifeOS-Delivery': crypto.randomUUID(),
        },
        body: bodyStr,
        signal: AbortSignal.timeout(10_000), // 10s timeout
      })

      responseStatus = res.status
      responseBody = await res.text().catch(() => null)
      success = res.ok
    } catch (e) {
      responseStatus = 0
      responseBody = String(e)
      success = false
    }

    // Log this attempt
    await supabase.from('webhook_logs').insert({
      webhook_id: webhookId,
      event,
      payload,
      response_status: responseStatus,
      response_body: responseBody?.slice(0, 2000) ?? null,
      attempt,
      success,
    })

    if (success) return

    // Exponential backoff before retry
    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, attempt * 2000))
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body: DeliverBody = await req.json()

    if (!body.event || !body.payload) {
      return new Response(JSON.stringify({ error: 'event and payload are required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Get user from auth header
    const authClient = getSupabaseClient(req.headers.get('Authorization'))
    const { data: { user } } = await authClient.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const admin = getSupabaseAdmin()

    // Fetch all enabled webhooks for this user that subscribe to this event
    const { data: endpoints } = await admin
      .from('webhook_endpoints')
      .select('id, url, secret, events')
      .eq('user_id', user.id)
      .eq('enabled', true)
      .contains('events', [body.event])

    if (!endpoints || endpoints.length === 0) {
      return new Response(JSON.stringify({ delivered: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Deliver to all matching endpoints in parallel
    const results = await Promise.allSettled(
      endpoints.map((ep) =>
        deliverToEndpoint(admin, ep.id, ep.url, ep.secret, body.event, body.payload)
      ),
    )

    const delivered = results.filter((r) => r.status === 'fulfilled').length

    return new Response(
      JSON.stringify({ delivered, total: endpoints.length }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
