// RAG Chat Edge Function
// Strategic Consultant with semantic search over user's data

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { getSupabaseClient } from '../_shared/supabase.ts'
import { chatCompletion, createEmbedding } from '../_shared/openai.ts'

interface ChatRequest {
  message: string
  sessionId?: string
}

interface ContextSource {
  title: string
  type: 'opportunity' | 'journal' | 'knowledge'
  content: string
  relevance: number
}

const SYSTEM_PROMPT = `You are a Strategic Life Consultant AI assistant embedded in a "Life Operating System" app.

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

    const { message, sessionId }: ChatRequest = await req.json()

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create embedding for the user's message
    const queryEmbedding = await createEmbedding(message)

    // Perform semantic search across all data sources
    const contextSources: ContextSource[] = []

    // Search opportunities
    const { data: opportunities } = await supabase.rpc('search_opportunities', {
      query_embedding: queryEmbedding,
      match_threshold: 0.6,
      match_count: 5,
      p_user_id: user.id,
    })

    if (opportunities) {
      for (const opp of opportunities) {
        contextSources.push({
          title: opp.title,
          type: 'opportunity',
          content: `[${opp.type}/${opp.status}] ${opp.title}${opp.description ? ': ' + opp.description : ''} (Priority: ${opp.priority}/10, Strategic Value: ${opp.strategic_value ?? 'N/A'})`,
          relevance: opp.similarity,
        })
      }
    }

    // Search daily logs
    const { data: logs } = await supabase.rpc('search_daily_logs', {
      query_embedding: queryEmbedding,
      match_threshold: 0.6,
      match_count: 3,
      p_user_id: user.id,
    })

    if (logs) {
      for (const log of logs) {
        contextSources.push({
          title: `Journal: ${log.log_date}`,
          type: 'journal',
          content: `[${log.log_date}] Mood: ${log.mood ?? 'N/A'}, Energy: ${log.energy_level ?? 'N/A'}/10. "${log.content}"`,
          relevance: log.similarity,
        })
      }
    }

    // Search knowledge base
    const { data: knowledge } = await supabase.rpc('search_knowledge_base', {
      query_embedding: queryEmbedding,
      match_threshold: 0.6,
      match_count: 3,
      p_user_id: user.id,
    })

    if (knowledge) {
      for (const kb of knowledge) {
        contextSources.push({
          title: kb.source_title ?? 'Knowledge Note',
          type: 'knowledge',
          content: kb.content_chunk ?? '',
          relevance: kb.similarity,
        })
      }
    }

    // Sort by relevance and take top sources
    contextSources.sort((a, b) => b.relevance - a.relevance)
    const topSources = contextSources.slice(0, 8)

    // Build context string
    const contextString = topSources.length > 0
      ? `\n\nRelevant context from your data:\n${topSources.map((s, i) => `${i + 1}. [${s.type}] ${s.content}`).join('\n')}`
      : '\n\nNo directly relevant context found in your data for this query.'

    // Get recent chat history for continuity
    const { data: chatHistory } = await supabase
      .from('chat_history')
      .select('role, content')
      .eq('user_id', user.id)
      .eq('session_id', sessionId ?? '')
      .order('created_at', { ascending: true })
      .limit(10)

    // Build messages array
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: SYSTEM_PROMPT + contextString },
    ]

    // Add chat history
    if (chatHistory) {
      for (const msg of chatHistory) {
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })
      }
    }

    // Add current message
    messages.push({ role: 'user', content: message })

    // Generate response
    const assistantResponse = await chatCompletion(messages, {
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 1024,
    })

    // Store messages in chat history
    const currentSessionId = sessionId ?? crypto.randomUUID()

    await supabase.from('chat_history').insert([
      {
        user_id: user.id,
        session_id: currentSessionId,
        role: 'user',
        content: message,
      },
      {
        user_id: user.id,
        session_id: currentSessionId,
        role: 'assistant',
        content: assistantResponse,
        sources: topSources.map(s => ({
          title: s.title,
          type: s.type,
          relevance: Math.round(s.relevance * 100) / 100,
        })),
      },
    ])

    return new Response(
      JSON.stringify({
        response: assistantResponse,
        sessionId: currentSessionId,
        sources: topSources.map(s => ({
          title: s.title,
          type: s.type,
          relevance: Math.round(s.relevance * 100) / 100,
        })),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('RAG chat error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
