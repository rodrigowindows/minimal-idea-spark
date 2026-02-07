import { corsHeaders } from '../_shared/cors.ts'
import { getSupabaseClient } from '../_shared/supabase.ts'

interface CreateSnapshotBody {
  entity_type: string
  entity_id: string
  content: string
  author_id: string
  comment?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    let body: CreateSnapshotBody
    try {
      body = (await req.json()) as CreateSnapshotBody
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }
    const supabase = getSupabaseClient(req.headers.get('Authorization'))
    const { data, error } = await supabase.from('version_snapshots').insert({
      entity_type: body.entity_type,
      entity_id: body.entity_id,
      content: body.content,
      author_id: body.author_id,
      comment: body.comment ?? null,
      created_at: new Date().toISOString(),
    }).select('id').single()
    if (error) throw error
    return new Response(JSON.stringify({ id: data?.id }), {
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
