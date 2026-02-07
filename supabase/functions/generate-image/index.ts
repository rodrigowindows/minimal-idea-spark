import { corsHeaders } from '../_shared/cors.ts'

interface GenerateImageBody {
  prompt: string
  size?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    let body: GenerateImageBody
    try {
      body = (await req.json()) as GenerateImageBody
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) {
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not set' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-2',
        prompt: body.prompt,
        n: 1,
        size: body.size ?? '512x512',
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(err)
    }
    const data = await res.json()
    const url = data.data?.[0]?.url
    const image = url ? {
      id: `img-${Date.now()}`,
      url,
      prompt: body.prompt,
      createdAt: new Date().toISOString(),
    } : null
    return new Response(JSON.stringify({ image }), {
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
