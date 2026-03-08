import { corsHeaders } from '../_shared/cors.ts'
import { chatCompletion, chatCompletionWithTools } from '../_shared/openai.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface AssistantChatBody {
  messages: { role: 'user' | 'assistant'; content: string }[]
  context?: string
  mode?: 'chat' | 'categorize' | 'journal-coach' | 'weekly-insights'
  data?: any
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

    const { messages, context, mode = 'chat', data } = body

    // ------- MODE: Auto-categorize opportunity -------
    if (mode === 'categorize') {
      const result = await chatCompletionWithTools(
        [
          {
            role: 'system',
            content: 'You classify tasks/opportunities for a productivity app. Analyze the title and description to determine the best type, priority (1-10), and status.',
          },
          {
            role: 'user',
            content: `Classify this opportunity:\nTitle: ${data?.title}\nDescription: ${data?.description || 'none'}`,
          },
        ],
        [
          {
            type: 'function',
            function: {
              name: 'classify_opportunity',
              description: 'Classify an opportunity by type, priority and suggested status',
              parameters: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['action', 'idea', 'resource', 'connection', 'event'] },
                  priority: { type: 'number', minimum: 1, maximum: 10 },
                  status: { type: 'string', enum: ['backlog', 'doing', 'blocked'] },
                  reasoning: { type: 'string', description: 'Brief explanation of the classification' },
                },
                required: ['type', 'priority', 'status', 'reasoning'],
                additionalProperties: false,
              },
            },
          },
        ],
        { type: 'function', function: { name: 'classify_opportunity' } },
        { temperature: 0.2 }
      )

      const toolCall = result.choices?.[0]?.message?.tool_calls?.[0]
      let classification = { type: 'action', priority: 5, status: 'backlog', reasoning: 'Default classification' }
      if (toolCall?.function?.arguments) {
        try {
          classification = JSON.parse(toolCall.function.arguments)
        } catch { /* use default */ }
      }

      return new Response(JSON.stringify({ classification }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // ------- MODE: Journal Coach -------
    if (mode === 'journal-coach') {
      const journalContext = data?.recentEntries
        ? `Recent journal entries:\n${data.recentEntries.map((e: any) => `${e.date}: mood=${e.mood}, energy=${e.energy}, "${e.content?.slice(0, 100)}"`).join('\n')}`
        : 'No recent journal entries.'

      const reply = await chatCompletion([
        {
          role: 'system',
          content: [
            'You are a compassionate journal coach in LifeOS, a productivity app.',
            'Help the user reflect on their day with guided questions based on their mood and energy.',
            'Keep responses warm, short (2-3 paragraphs max), and end with 1-2 reflective questions.',
            'Support both English and Portuguese.',
            journalContext,
          ].join('\n'),
        },
        ...messages.slice(-6).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      ], { temperature: 0.8, maxTokens: 512 })

      return new Response(JSON.stringify({ reply }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // ------- MODE: Weekly Insights (AI-powered) -------
    if (mode === 'weekly-insights') {
      const metricsText = data
        ? `User metrics this week:
- Tasks completed: ${data.tasks_completed ?? 0}
- Tasks in progress: ${data.tasks_doing ?? 0}
- Deep work minutes: ${data.deep_work_minutes ?? 0}
- Streak days: ${data.streak_days ?? 0}
- XP gained: ${data.xp_gained ?? 0}
- Average mood: ${data.avg_mood ?? 'unknown'}
- Average energy: ${data.avg_energy ?? 'unknown'}
- Habits completion rate: ${data.habits_rate ?? 'unknown'}%
- Active goals: ${data.goals_count ?? 0}
- Goals avg progress: ${data.goals_progress ?? 0}%
- Domains active: ${data.domains?.join(', ') || 'none'}`
        : 'No metrics available.'

      const reply = await chatCompletion([
        {
          role: 'system',
          content: [
            'You are an AI productivity analyst for LifeOS.',
            'Generate a weekly review with 3-5 actionable insights.',
            'Format: Use markdown with bold titles for each insight.',
            'Categories: 🎯 Productivity, 💪 Habits, 🧠 Focus, 😊 Wellbeing, 🏆 Goals',
            'Be specific, data-driven, and encouraging.',
            'End with one concrete "Challenge of the Week".',
            'Support both English and Portuguese (match user language).',
          ].join('\n'),
        },
        { role: 'user', content: `Generate my weekly insights based on:\n${metricsText}` },
      ], { temperature: 0.7, maxTokens: 800 })

      return new Response(JSON.stringify({ reply }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // ------- MODE: Chat (default, with rich context) -------
    const system = [
      'You are a helpful AI assistant embedded in LifeOS, a second-brain productivity app.',
      'The user can manage tasks (opportunities), journal entries, goals, habits, calendar events, and track XP/gamification.',
      context ? `\n${context}` : '',
      '\nGuidelines:',
      '- Keep replies concise (1-3 short paragraphs max)',
      '- Be actionable: suggest specific next steps',
      '- Reference the user\'s data when relevant (tasks, goals, streaks)',
      '- You can suggest commands: /task "name", /journal "entry", /focus, /stats, /open page',
      '- Support both English and Portuguese',
      '- Use markdown formatting (bold, lists, etc.)',
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
    const errMsg = String(e)
    const status = errMsg.includes('RATE_LIMITED') ? 429
      : errMsg.includes('PAYMENT_REQUIRED') ? 402
      : 500
    return new Response(JSON.stringify({ error: errMsg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    })
  }
})
