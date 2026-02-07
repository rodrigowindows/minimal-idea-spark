// RAG Chat Edge Function
// Strategic Consultant with semantic search over user's data
// Supports SSE streaming for real-time token delivery

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { getSupabaseClient } from '../_shared/supabase.ts'
import { createEmbedding } from '../_shared/openai.ts'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

interface ChatRequest {
  message: string
  sessionId?: string
  stream?: boolean
}

interface ContextSource {
  title: string
  type: 'opportunity' | 'journal' | 'knowledge'
  content: string
  relevance: number
  metadata?: Record<string, unknown>
}

const SYSTEM_PROMPT = `Você é um mentor estratégico. Analise os seguintes logs diários do usuário e as oportunidades atuais. Responda à pergunta do usuário considerando o cansaço e as metas dele.

You have access to the user's:
- Daily journal logs with mood, energy levels, and reflections
- Opportunities (tasks, goals, insights) with priorities and strategic values
- Knowledge base (book summaries, notes)

Your role is to:
1. Help the user make better decisions about what to prioritize
2. Identify patterns in their data (energy, productivity, mood, fatigue)
3. Provide actionable advice based on their goals and history
4. Be encouraging but honest about areas needing attention
5. Consider the user's energy level and mood when suggesting tasks — if they're tired, suggest lighter tasks or rest

When responding:
- Reference specific items from the context when relevant (journal entries, opportunities)
- Be concise but insightful
- Frame suggestions in terms of strategic value and goal alignment
- If mood/energy data is available, factor it into your recommendations
- If you don't have enough context, say so and ask clarifying questions

Current context from user's data will be provided below.`

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    const supabase = getSupabaseClient(authHeader)

    // Verify user is authenticated
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

    // Create embedding for the user's message
    const queryEmbedding = await createEmbedding(message)

    // Use unified match_documents RPC for semantic search
    const { data: documents } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: 0.6,
      match_count: 10,
      p_user_id: user.id,
    })

    // Build context sources from unified results
    const contextSources: ContextSource[] = []
    if (documents) {
      for (const doc of documents) {
        contextSources.push({
          title: doc.title,
          type: doc.source_type as ContextSource['type'],
          content: doc.content,
          relevance: doc.similarity,
          metadata: doc.metadata,
        })
      }
    }

    // Take top 8 sources (already sorted by similarity from the RPC)
    const topSources = contextSources.slice(0, 8)

    // Also fetch recent daily_logs explicitly (semantic search may miss them)
    const { data: recentLogs } = await supabase
      .from('daily_logs')
      .select('content, mood, energy_level, log_date')
      .eq('user_id', user.id)
      .order('log_date', { ascending: false })
      .limit(7)

    // Fetch active opportunities explicitly
    const { data: activeOpps } = await supabase
      .from('opportunities')
      .select('title, type, status, priority, strategic_value')
      .eq('user_id', user.id)
      .in('status', ['doing', 'review'])
      .order('priority', { ascending: false })
      .limit(10)

    // Build explicit context sections
    let explicitContext = ''

    if (recentLogs && recentLogs.length > 0) {
      explicitContext += '\n\nRecent daily logs:\n'
      for (const log of recentLogs) {
        explicitContext += `- [${log.log_date}] Mood: ${log.mood ?? 'N/A'}, Energy: ${log.energy_level ?? 'N/A'}/10. "${log.content}"\n`
      }
    }

    if (activeOpps && activeOpps.length > 0) {
      explicitContext += '\n\nActive opportunities:\n'
      for (const opp of activeOpps) {
        explicitContext += `- [${opp.type}/${opp.status}] ${opp.title} (Priority: ${opp.priority}/10, Strategic Value: ${opp.strategic_value ?? 'N/A'})\n`
      }
    }

    // Build context string for the LLM
    const contextString = topSources.length > 0
      ? `\n\nRelevant context from your data:\n${topSources.map((s, i) => {
          const meta = s.metadata || {}
          let detail = ''
          if (s.type === 'opportunity') {
            detail = `[${meta.type}/${meta.status}] ${s.title}${s.content ? ': ' + s.content : ''} (Priority: ${meta.priority}/10, Strategic Value: ${meta.strategic_value ?? 'N/A'})`
          } else if (s.type === 'journal') {
            detail = `[${meta.log_date}] Mood: ${meta.mood ?? 'N/A'}, Energy: ${meta.energy_level ?? 'N/A'}/10. "${s.content}"`
          } else {
            detail = `${s.title}: ${s.content}`
          }
          return `${i + 1}. [${s.type}] ${detail}`
        }).join('\n')}`
      : '\n\nNo directly relevant context found via semantic search.'

    // Get recent chat history for continuity
    const currentSessionId = sessionId ?? crypto.randomUUID()
    const { data: chatHistory } = await supabase
      .from('chat_history')
      .select('role, content')
      .eq('user_id', user.id)
      .eq('session_id', currentSessionId)
      .order('created_at', { ascending: true })
      .limit(10)

    // Build messages array for OpenAI
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: SYSTEM_PROMPT + explicitContext + contextString },
    ]

    if (chatHistory) {
      for (const msg of chatHistory) {
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })
      }
    }

    messages.push({ role: 'user', content: message })

    // Prepare sources payload for the response
    const sourcesPayload = topSources.map(s => ({
      title: s.title,
      type: s.type,
      relevance: Math.round(s.relevance * 100) / 100,
      metadata: s.metadata,
    }))

    // Store user message in chat history
    await supabase.from('chat_history').insert({
      user_id: user.id,
      session_id: currentSessionId,
      role: 'user',
      content: message,
    })

    if (stream) {
      // --- SSE Streaming Response ---
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages,
          temperature: 0.7,
          max_tokens: 1024,
          stream: true,
        }),
      })

      if (!openaiResponse.ok) {
        throw new Error(`OpenAI API error: ${openaiResponse.statusText}`)
      }

      const reader = openaiResponse.body!.getReader()
      const decoder = new TextDecoder()
      let fullResponse = ''

      const readableStream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder()

          // Send sources as the first SSE event
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
                } catch {
                  // Skip unparseable chunks
                }
              }
            }

            // Store assistant response in chat history
            await supabase.from('chat_history').insert({
              user_id: user.id,
              session_id: currentSessionId,
              role: 'assistant',
              content: fullResponse,
              sources: sourcesPayload,
            })

            // Send done event
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
      // --- Non-streaming JSON Response ---
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages,
          temperature: 0.7,
          max_tokens: 1024,
        }),
      })

      if (!openaiResponse.ok) {
        throw new Error(`OpenAI API error: ${openaiResponse.statusText}`)
      }

      const data = await openaiResponse.json()
      const assistantResponse = data.choices[0].message.content

      await supabase.from('chat_history').insert({
        user_id: user.id,
        session_id: currentSessionId,
        role: 'assistant',
        content: assistantResponse,
        sources: sourcesPayload,
      })

      return new Response(
        JSON.stringify({
          response: assistantResponse,
          sessionId: currentSessionId,
          sources: sourcesPayload,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    console.error('RAG chat error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
