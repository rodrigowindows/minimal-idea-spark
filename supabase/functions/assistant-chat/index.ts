import { corsHeaders } from '../_shared/cors.ts'
import { chatCompletion } from '../_shared/openai.ts'

interface AssistantChatBody {
  messages: { role: 'user' | 'assistant'; content: string }[]
  context?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    let body: AssistantChatBody
    try {
      body = (await req.json()) as AssistantChatBody
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const { messages, context } = body

    const system = [
      'You are a helpful AI assistant embedded in Canvas/LifeOS, a second-brain productivity app.',
      'The user can manage tasks (opportunities), journal entries, goals, habits, calendar events, and track XP/gamification.',
      context ? `\n${context}` : '',
      '\nGuidelines:',
      '- Keep replies concise (1-3 short paragraphs max)',
      '- Be actionable: suggest specific next steps',
      '- Reference the user\'s data when relevant (tasks, goals, streaks)',
      '- You can suggest commands: /task "name", /journal "entry", /focus, /stats, /open page',
      '- Support both English and Portuguese',
      '- If the user asks something outside your capabilities, explain what you CAN do',
    ].join('\n')

    const out = await chatCompletion([
      { role: 'system', content: system },
      ...messages.slice(-12).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ], { temperature: 0.7, maxTokens: 512 })

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
