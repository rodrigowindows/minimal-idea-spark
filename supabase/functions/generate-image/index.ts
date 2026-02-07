import { corsHeaders } from '../_shared/cors.ts'

interface GenerateImageBody {
  action?: 'generate' | 'variation' | 'edit' | 'upscale' | 'remove-bg'
  prompt?: string
  model?: 'dall-e-2' | 'dall-e-3'
  size?: string
  style?: string
  quality?: string
  negativePrompt?: string
  imageUrl?: string
  mask?: string
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

    const action = body.action ?? 'generate'

    // Handle non-generation actions (upscale, remove-bg) as pass-through stubs
    if (action === 'upscale' || action === 'remove-bg') {
      return new Response(
        JSON.stringify({ url: body.imageUrl ?? null, message: `${action} not yet implemented server-side` }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    // Handle variations (DALL-E 2 only)
    if (action === 'variation') {
      // OpenAI variations API requires an image upload – for URL-based images
      // we re-generate with the same prompt as a workaround
      if (!body.prompt) {
        return new Response(JSON.stringify({ error: 'Prompt required for variation' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }

      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'dall-e-2',
          prompt: body.prompt,
          n: 1,
          size: '1024x1024',
        }),
      })

      if (!res.ok) {
        const err = await res.text()
        throw new Error(err)
      }

      const data = await res.json()
      const url = data.data?.[0]?.url

      return new Response(
        JSON.stringify({
          image: url
            ? {
                id: `var-${Date.now()}`,
                url,
                prompt: body.prompt,
                createdAt: new Date().toISOString(),
              }
            : null,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    // Handle edits (DALL-E 2 inpainting) – simplified: re-generates from prompt
    if (action === 'edit') {
      if (!body.prompt) {
        return new Response(JSON.stringify({ error: 'Prompt required for edit' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }

      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'dall-e-2',
          prompt: body.prompt,
          n: 1,
          size: '1024x1024',
        }),
      })

      if (!res.ok) {
        const err = await res.text()
        throw new Error(err)
      }

      const data = await res.json()
      const url = data.data?.[0]?.url

      return new Response(
        JSON.stringify({
          image: url
            ? {
                id: `edit-${Date.now()}`,
                url,
                prompt: body.prompt,
                createdAt: new Date().toISOString(),
              }
            : null,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    // Default: generate new image
    if (!body.prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const model = body.model ?? 'dall-e-3'
    const size = body.size ?? '1024x1024'
    const style = body.style ?? 'vivid'
    const quality = body.quality ?? 'standard'

    // Build the final prompt (append negative prompt if provided)
    let finalPrompt = body.prompt
    if (body.negativePrompt) {
      finalPrompt = `${body.prompt}. Avoid: ${body.negativePrompt}`
    }

    const requestBody: Record<string, unknown> = {
      model,
      prompt: finalPrompt,
      n: 1,
      size,
    }

    // DALL-E 3 specific params
    if (model === 'dall-e-3') {
      requestBody.style = style
      requestBody.quality = quality
    }

    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(err)
    }

    const data = await res.json()
    const url = data.data?.[0]?.url
    const revisedPrompt = data.data?.[0]?.revised_prompt

    const image = url
      ? {
          id: `img-${Date.now()}`,
          url,
          prompt: body.prompt,
          revisedPrompt: revisedPrompt ?? undefined,
          createdAt: new Date().toISOString(),
        }
      : null

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
