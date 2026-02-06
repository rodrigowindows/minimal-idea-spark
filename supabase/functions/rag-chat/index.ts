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

const SYSTEM_PROMPT = `Você é um estrategista de vida de alta performance. Use o contexto fornecido (tarefas e diários do usuário) para dar conselhos táticos e priorizações.

You have access to the user's:
- Opportunities (tasks, goals, insights) with priorities and strategic values
- Daily journal logs with mood and energy data
- Knowledge base (book summaries, notes)

Your role is to:
1. Help the user make better decisions about what to prioritize
2. Identify patterns in their data (energy, productivity, mood)
3. Provide actionable advice based on their goals and history
4. Be encouraging but honest about areas needing attention

When responding:
- Reference specific items from the context when relevant
- Be concise but insightful
- Frame suggestions in terms of strategic value and goal alignment
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
      : '\n\nNo directly relevant context found in your data for this query.'

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
      { role: 'system', content: SYSTEM_PROMPT + contextString },
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
