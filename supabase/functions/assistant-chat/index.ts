import { corsHeaders } from '../_shared/cors.ts'
import { chatCompletion } from '../_shared/openai.ts'

interface AssistantChatBody {
  messages: { role: 'user' | 'assistant'; content: string }[]
  context?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { messages, context } = (await req.json()) as AssistantChatBody
    const system = `You are a helpful assistant for a second-brain app. Context: ${context ?? 'none'}. You can suggest creating tasks, logging to journal, or opening pages. Keep replies short.`
    const out = await chatCompletion([
      { role: 'system', content: system },
      ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ], { temperature: 0.7, maxTokens: 256 })
    return new Response(JSON.stringify({ reply: out }), {
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
