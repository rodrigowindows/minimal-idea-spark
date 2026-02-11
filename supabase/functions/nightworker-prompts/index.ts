import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
}

type PromptStatus = 'pending' | 'done' | 'failed'
type Provider = 'codex' | 'claude' | 'codex_cli' | 'claude_cli' | 'openai_api'

interface PromptPayload {
  provider: Provider
  name: string
  content: string
  target_folder?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const path = url.pathname.split('/').filter(Boolean).slice(2) // remove functions/v1
  const [, ...rest] = path // first element is function name
  const route = '/' + rest.join('/')

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    }
  )

  try {
    if (req.method === 'GET' && (route === '/' || route === '/prompts' || route === '/')) {
      return await handleList(supabase, url)
    }

    if (req.method === 'GET' && route.startsWith('/prompts/')) {
      const id = route.split('/')[2]
      return await handleGet(supabase, id)
    }

    if (req.method === 'POST' && (route === '/prompts' || route === '/')) {
      const body = await req.json() as PromptPayload
      return await handleCreate(supabase, body)
    }

    if (req.method === 'PATCH' && route.startsWith('/prompts/')) {
      const id = route.split('/')[2]
      const body = await req.json()
      return await handleUpdate(supabase, id, body)
    }

    return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers: corsHeaders })
  } catch (err) {
    console.error('[nightworker-prompts] error', err)
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: corsHeaders })
  }
})

async function handleList(supabase: any, url: URL) {
  const status = url.searchParams.get('status')
  const provider = url.searchParams.get('provider')
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')
  const limit = Number(url.searchParams.get('limit') ?? 100)
  const offset = Number(url.searchParams.get('offset') ?? 0)

  let query = supabase.from('nw_prompts').select('*', { count: 'exact' }).order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (provider) query = query.eq('provider', provider)
  if (from) query = query.gte('created_at', from)
  if (to) query = query.lte('created_at', to)
  if (Number.isFinite(limit)) query = query.limit(limit)
  if (Number.isFinite(offset)) query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query
  if (error) throw error
  return json({ total: count ?? data.length, prompts: data })
}

async function handleGet(supabase: any, id: string) {
  const { data, error } = await supabase.from('nw_prompts').select('*').eq('id', id).single()
  if (error) throw error
  const { data: events } = await supabase
    .from('nw_prompt_events')
    .select('*')
    .eq('prompt_id', id)
    .order('created_at', { ascending: false })
  return json({ ...data, events: events ?? [] })
}

async function handleCreate(supabase: any, body: PromptPayload) {
  if (!body?.name || !body?.provider || !body?.content) {
    return json({ error: 'provider, name e content são obrigatórios' }, 400)
  }
  const { data, error } = await supabase
    .from('nw_prompts')
    .insert({
      name: body.name,
      provider: body.provider,
      content: body.content,
      target_folder: body.target_folder,
      status: 'pending',
    })
    .select()
    .single()
  if (error) throw error
  return json({ id: data.id })
}

async function handleUpdate(supabase: any, id: string, body: Record<string, unknown>) {
  const allowed: Record<string, unknown> = {}
  if (body.status) allowed.status = body.status as PromptStatus
  if (body.result_path !== undefined) allowed.result_path = body.result_path
  if (body.result_content !== undefined) allowed.result_content = body.result_content
  if (body.error !== undefined) allowed.error = body.error
  if (body.attempts !== undefined) allowed.attempts = body.attempts
  if (body.next_retry_at !== undefined) allowed.next_retry_at = body.next_retry_at
  if (body.content !== undefined) allowed.content = body.content
  if (body.target_folder !== undefined) allowed.target_folder = body.target_folder

  const { data, error } = await supabase
    .from('nw_prompts')
    .update(allowed)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error

  if (body.event_type || body.event_message) {
    await supabase.from('nw_prompt_events').insert({
      prompt_id: id,
      type: String(body.event_type ?? 'update'),
      message: body.event_message ? String(body.event_message) : null,
    })
  }

  return json({ id: data.id, status: data.status })
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}
