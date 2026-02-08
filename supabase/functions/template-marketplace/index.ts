import { corsHeaders } from '../_shared/cors.ts'
import { getSupabaseClient, getSupabaseAdmin } from '../_shared/supabase.ts'

interface TemplateRow {
  id: string
  user_id: string
  name: string
  description: string | null
  body: string
  category: string
  tags: string[]
  is_public: boolean
  version: number
  downloads: number
  rating: number
  author_name: string | null
  created_at: string
  updated_at: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const authHeader = req.headers.get('Authorization')
    const supabase = getSupabaseClient(authHeader)

    // GET /template-marketplace — list public templates
    if (req.method === 'GET') {
      const category = url.searchParams.get('category')
      const search = url.searchParams.get('search')
      const sort = url.searchParams.get('sort') ?? 'downloads'
      const limit = Math.min(Number(url.searchParams.get('limit') ?? '50'), 100)
      const offset = Number(url.searchParams.get('offset') ?? '0')

      let query = supabase
        .from('templates')
        .select('id,name,description,body,category,tags,is_public,version,downloads,rating,author_name,created_at')
        .eq('is_public', true)

      if (category && category !== 'all') {
        query = query.eq('category', category)
      }

      if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
      }

      if (sort === 'rating') {
        query = query.order('rating', { ascending: false })
      } else if (sort === 'newest') {
        query = query.order('created_at', { ascending: false })
      } else {
        query = query.order('downloads', { ascending: false })
      }

      query = query.range(offset, offset + limit - 1)

      const { data, error } = await query

      if (error) throw error

      return new Response(JSON.stringify({ templates: data ?? [], count: data?.length ?? 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // POST /template-marketplace — publish a template
    if (req.method === 'POST') {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        })
      }

      const body = await req.json()
      const { name, description, template_body, category, tags } = body

      if (!name || !template_body || !category) {
        return new Response(JSON.stringify({ error: 'Missing required fields: name, template_body, category' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }

      const { data, error } = await supabase
        .from('templates')
        .insert({
          user_id: user.id,
          name,
          description: description ?? null,
          body: template_body,
          category,
          tags: tags ?? [],
          is_public: true,
          version: 1,
          downloads: 0,
          rating: 0,
          author_name: user.user_metadata?.full_name ?? 'Anonymous',
        })
        .select()
        .single()

      if (error) throw error

      return new Response(JSON.stringify({ template: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      })
    }

    // PATCH /template-marketplace?id=xxx — increment download count
    if (req.method === 'PATCH') {
      const templateId = url.searchParams.get('id')
      if (!templateId) {
        return new Response(JSON.stringify({ error: 'Missing template id' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }

      const admin = getSupabaseAdmin()
      const { error } = await admin.rpc('increment_template_downloads', { template_id: templateId })

      if (error) {
        // Fallback: manual increment
        const { data: current } = await admin.from('templates').select('downloads').eq('id', templateId).single()
        if (current) {
          await admin.from('templates').update({ downloads: (current.downloads ?? 0) + 1 }).eq('id', templateId)
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
