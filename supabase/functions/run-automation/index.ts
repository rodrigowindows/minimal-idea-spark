import { corsHeaders } from '../_shared/cors.ts'
import { getSupabaseClient } from '../_shared/supabase.ts'

interface RunAutomationBody {
  automation_id: string
  context: { event?: string; payload?: Record<string, unknown>; user_id: string }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    let body: RunAutomationBody
    try {
      body = (await req.json()) as RunAutomationBody
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }
    const authHeader = req.headers.get('Authorization')
    const supabase = getSupabaseClient(authHeader)
    const { automation_id, context } = body
    const { data: automation } = await supabase
      .from('automations')
      .select('*')
      .eq('id', automation_id)
      .single()
    if (!automation?.enabled) {
      return new Response(JSON.stringify({ ran: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }
    await supabase.from('automation_logs').insert({
      automation_id,
      triggered_at: new Date().toISOString(),
      context,
    })
    return new Response(JSON.stringify({ ran: true }), {
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
