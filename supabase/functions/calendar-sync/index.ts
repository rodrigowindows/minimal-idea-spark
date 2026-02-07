import { corsHeaders } from '../_shared/cors.ts'
import { getSupabaseClient } from '../_shared/supabase.ts'

interface CalendarSyncBody {
  user_id: string
  source: 'google' | 'outlook' | 'internal'
  events?: { start: string; end: string; title: string; id?: string }[]
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    let body: CalendarSyncBody
    try {
      body = (await req.json()) as CalendarSyncBody
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }
    const authHeader = req.headers.get('Authorization')
    const supabase = getSupabaseClient(authHeader)
    if (body.events?.length) {
      const rows = body.events.map((e) => ({
        user_id: body.user_id,
        source: body.source,
        start_at: e.start,
        end_at: e.end,
        title: e.title,
        external_id: e.id ?? null,
        created_at: new Date().toISOString(),
      }))
      const { error } = await supabase.from('calendar_events').insert(rows)
      if (error) throw error
    }
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
