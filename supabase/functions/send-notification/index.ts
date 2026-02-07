import { corsHeaders } from '../_shared/cors.ts'
import { getSupabaseClient } from '../_shared/supabase.ts'

interface SendNotificationBody {
  user_id: string
  title: string
  body: string
  channel: 'in_app' | 'email' | 'push'
  priority?: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = getSupabaseClient(req.headers.get('Authorization'))
    const body = (await req.json()) as SendNotificationBody
    const { error } = await supabase.from('notifications').insert({
      user_id: body.user_id,
      title: body.title,
      body: body.body,
      channel: body.channel,
      priority: body.priority ?? 0,
      read: false,
      created_at: new Date().toISOString(),
    })
    if (error) throw error
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
