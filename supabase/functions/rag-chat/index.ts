// RAG Chat Edge Function
// Strategic Consultant powered by Lovable AI with full user context
// Supports SSE streaming for real-time token delivery

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { getSupabaseClient } from '../_shared/supabase.ts'

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions'

interface ChatRequest {
  message: string
  sessionId?: string
  stream?: boolean
}

const SYSTEM_PROMPT = `You are a strategic mentor and life OS advisor. You have full access to the user's real-time data: opportunities, goals, habits, journal entries, and calendar events.

Your role:
1. Help the user make better decisions about what to prioritize
2. Identify patterns in their data (energy, productivity, mood, habits)
3. Provide actionable advice aligned with their goals
4. Be encouraging but honest about areas needing attention
5. Consider energy levels and mood when suggesting tasks
6. Reference specific data points — be concrete, not generic

Style guidelines:
- Use markdown formatting (headers, bold, lists)
- Be concise but insightful
- Always reference the user's actual data when relevant
- If asked about something not in the data, say so honestly
- Respond in the same language the user writes in`

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    const supabase = getSupabaseClient(authHeader)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { message, sessionId, stream = true }: ChatRequest = await req.json()

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch all user context in parallel
    const [oppsResult, goalsResult, habitsResult, logsResult, eventsResult, xpResult] = await Promise.all([
      supabase.from('opportunities').select('title, type, status, priority, strategic_value, domain_id, due_date')
        .eq('user_id', user.id).order('priority', { ascending: false }).limit(30),
      supabase.from('goals').select('title, description, progress, status, cycle, target_date, key_results, milestones')
        .eq('user_id', user.id).limit(20),
      supabase.from('habits').select('title, frequency, current_streak, best_streak')
        .eq('user_id', user.id).limit(20),
      supabase.from('daily_logs').select('content, mood, energy_level, log_date')
        .eq('user_id', user.id).order('log_date', { ascending: false }).limit(7),
      supabase.from('calendar_events').select('title, start, end, category')
        .eq('user_id', user.id).gte('start', new Date().toISOString()).order('start', { ascending: true }).limit(10),
      supabase.from('xp_summaries').select('level, xp_total, streak_days, deep_work_minutes, opportunities_completed, week_score')
        .eq('user_id', user.id).limit(1),
    ])

    // Build context from real data
    let userContext = ''

    const opps = oppsResult.data || []
    if (opps.length > 0) {
      const doing = opps.filter((o: any) => o.status === 'doing')
      const backlog = opps.filter((o: any) => o.status === 'backlog')
      const done = opps.filter((o: any) => o.status === 'done')
      const review = opps.filter((o: any) => o.status === 'review')
      userContext += `\n\n## Opportunities (${opps.length} total: ${doing.length} doing, ${review.length} review, ${backlog.length} backlog, ${done.length} done)\n`
      for (const o of opps.filter((o: any) => o.status !== 'done').slice(0, 15)) {
        const due = o.due_date ? ` | Due: ${o.due_date}` : ''
        userContext += `- [${o.status}] "${o.title}" (${o.type}, P:${o.priority}/10, SV:${o.strategic_value ?? '?'}${due})\n`
      }
    }

    const goals = goalsResult.data || []
    if (goals.length > 0) {
      userContext += `\n\n## Goals & OKRs (${goals.length})\n`
      for (const g of goals) {
        const krs = Array.isArray(g.key_results) ? (g.key_results as any[]) : []
        const krSummary = krs.length > 0 ? ` | KRs: ${krs.map((kr: any) => `${kr.title}: ${kr.current ?? 0}/${kr.target ?? 100}`).join(', ')}` : ''
        userContext += `- [${g.status}] "${g.title}" — ${g.progress}% (${g.cycle}, target: ${g.target_date})${krSummary}\n`
      }
    }

    const habits = habitsResult.data || []
    if (habits.length > 0) {
      userContext += `\n\n## Habits (${habits.length})\n`
      for (const h of habits) {
        userContext += `- "${h.title}" (${h.frequency}) — streak: ${h.current_streak}d, best: ${h.best_streak}d\n`
      }
    }

    const logs = logsResult.data || []
    if (logs.length > 0) {
      userContext += `\n\n## Recent Journal (last ${logs.length} days)\n`
      for (const l of logs) {
        userContext += `- [${l.log_date}] Mood: ${l.mood ?? 'N/A'}, Energy: ${l.energy_level ?? '?'}/10 — "${l.content?.slice(0, 200)}"\n`
      }
    }

    const events = eventsResult.data || []
    if (events.length > 0) {
      userContext += `\n\n## Upcoming Calendar Events\n`
      for (const e of events) {
        userContext += `- "${e.title}" (${e.category}) at ${e.start}\n`
      }
    }

    const xp = xpResult.data?.[0]
    if (xp) {
      userContext += `\n\n## XP & Gamification\nLevel ${xp.level} | ${xp.xp_total} XP | Streak: ${xp.streak_days}d | Deep Work: ${Math.round((xp.deep_work_minutes || 0) / 60)}h | Completed: ${xp.opportunities_completed} | Week Score: ${xp.week_score ?? 'N/A'}\n`
    }

    // Build sources for the UI
    const sourcesPayload = [
      ...(opps.length > 0 ? [{ title: 'Opportunities', type: 'opportunity', relevance: 0.95 }] : []),
      ...(goals.length > 0 ? [{ title: 'Goals & OKRs', type: 'knowledge', relevance: 0.92 }] : []),
      ...(logs.length > 0 ? [{ title: 'Journal Entries', type: 'journal', relevance: 0.88 }] : []),
      ...(habits.length > 0 ? [{ title: 'Habit Tracking', type: 'knowledge', relevance: 0.85 }] : []),
      ...(events.length > 0 ? [{ title: 'Calendar Events', type: 'knowledge', relevance: 0.80 }] : []),
      ...(xp ? [{ title: 'XP Progress', type: 'knowledge', relevance: 0.75 }] : []),
    ]

    // Get chat history for continuity
    const currentSessionId = sessionId ?? crypto.randomUUID()
    const { data: chatHistory } = await supabase
      .from('chat_history')
      .select('role, content')
      .eq('user_id', user.id)
      .eq('session_id', currentSessionId)
      .order('created_at', { ascending: true })
      .limit(20)

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: SYSTEM_PROMPT + userContext },
    ]

    if (chatHistory) {
      for (const msg of chatHistory) {
        messages.push({ role: msg.role as 'user' | 'assistant', content: msg.content })
      }
    }
    messages.push({ role: 'user', content: message })

    // Store user message
    await supabase.from('chat_history').insert({
      user_id: user.id,
      session_id: currentSessionId,
      role: 'user',
      content: message,
    })

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured')
    }

    if (stream) {
      const aiResponse = await fetch(AI_GATEWAY_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages,
          temperature: 0.7,
          max_tokens: 1500,
          stream: true,
        }),
      })

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again shortly.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please top up.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (!aiResponse.ok) {
        const errText = await aiResponse.text()
        console.error('AI gateway error:', aiResponse.status, errText)
        throw new Error(`AI gateway error: ${aiResponse.status}`)
      }

      const reader = aiResponse.body!.getReader()
      const decoder = new TextDecoder()
      let fullResponse = ''

      const readableStream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder()

          // Send sources first
          controller.enqueue(encoder.encode(`event: sources\ndata: ${JSON.stringify({ sessionId: currentSessionId, sources: sourcesPayload })}\n\n`))

          try {
            let buffer = ''
            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              buffer += decoder.decode(value, { stream: true })
              const lines = buffer.split('\n')
              buffer = lines.pop() || ''

              for (const line of lines) {
                const trimmed = line.trim()
                if (!trimmed || !trimmed.startsWith('data: ')) continue
                const data = trimmed.slice(6)
                if (data === '[DONE]') continue

                try {
                  const parsed = JSON.parse(data)
                  const delta = parsed.choices?.[0]?.delta?.content
                  if (delta) {
                    fullResponse += delta
                    controller.enqueue(encoder.encode(`event: token\ndata: ${JSON.stringify({ token: delta })}\n\n`))
                  }
                } catch { /* skip */ }
              }
            }

            // Store assistant response
            await supabase.from('chat_history').insert({
              user_id: user.id,
              session_id: currentSessionId,
              role: 'assistant',
              content: fullResponse,
              sources: sourcesPayload,
            })

            controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify({ sessionId: currentSessionId })}\n\n`))
            controller.close()
          } catch (err) {
            controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`))
            controller.close()
          }
        },
      })

      return new Response(readableStream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    } else {
      const aiResponse = await fetch(AI_GATEWAY_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages,
          temperature: 0.7,
          max_tokens: 1500,
        }),
      })

      if (!aiResponse.ok) {
        const errText = await aiResponse.text()
        console.error('AI gateway error:', aiResponse.status, errText)
        throw new Error(`AI gateway error: ${aiResponse.status}`)
      }

      const data = await aiResponse.json()
      const assistantResponse = data.choices[0].message.content

      await supabase.from('chat_history').insert({
        user_id: user.id,
        session_id: currentSessionId,
        role: 'assistant',
        content: assistantResponse,
        sources: sourcesPayload,
      })

      return new Response(
        JSON.stringify({ response: assistantResponse, sessionId: currentSessionId, sources: sourcesPayload }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    console.error('RAG chat error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
