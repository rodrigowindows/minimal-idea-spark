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
    const authHeader = req.headers.get('Authorization')
    const supabase = getSupabaseClient(authHeader)
    const body = (await req.json()) as CalendarSyncBody
    if (body.events?.length) {
      const { error } = await supabase.from('calendar_events').upsert(
        body.events.map((e) => ({
          user_id: body.user_id,
          source: body.source,
          start_at: e.start,
          end_at: e.end,
          title: e.title,
          external_id: e.id ?? null,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: 'user_id,external_id,source' }
      )
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
