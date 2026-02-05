// RAG Query Edge Function
// Performs semantic search across user's data

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { getSupabaseClient } from '../_shared/supabase.ts'
import { createEmbedding } from '../_shared/openai.ts'

interface QueryRequest {
  query: string
  sources?: ('opportunities' | 'daily_logs' | 'knowledge_base')[]
  matchThreshold?: number
  matchCount?: number
}

interface SearchResult {
  id: string
  type: 'opportunity' | 'journal' | 'knowledge'
  title: string
  content: string
  similarity: number
  metadata: Record<string, unknown>
}

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

    const {
      query,
      sources = ['opportunities', 'daily_logs', 'knowledge_base'],
      matchThreshold = 0.6,
      matchCount = 10,
    }: QueryRequest = await req.json()

    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create embedding for query
    const queryEmbedding = await createEmbedding(query)

    const results: SearchResult[] = []

    // Search opportunities
    if (sources.includes('opportunities')) {
      const { data: opportunities } = await supabase.rpc('search_opportunities', {
        query_embedding: queryEmbedding,
        match_threshold: matchThreshold,
        match_count: matchCount,
        p_user_id: user.id,
      })

      if (opportunities) {
        for (const opp of opportunities) {
          results.push({
            id: opp.id,
            type: 'opportunity',
            title: opp.title,
            content: opp.description ?? '',
            similarity: opp.similarity,
            metadata: {
              type: opp.type,
              status: opp.status,
              priority: opp.priority,
              strategic_value: opp.strategic_value,
            },
          })
        }
      }
    }

    // Search daily logs
    if (sources.includes('daily_logs')) {
      const { data: logs } = await supabase.rpc('search_daily_logs', {
        query_embedding: queryEmbedding,
        match_threshold: matchThreshold,
        match_count: matchCount,
        p_user_id: user.id,
      })

      if (logs) {
        for (const log of logs) {
          results.push({
            id: log.id,
            type: 'journal',
            title: `Journal: ${log.log_date}`,
            content: log.content,
            similarity: log.similarity,
            metadata: {
              mood: log.mood,
              energy_level: log.energy_level,
              log_date: log.log_date,
            },
          })
        }
      }
    }

    // Search knowledge base
    if (sources.includes('knowledge_base')) {
      const { data: knowledge } = await supabase.rpc('search_knowledge_base', {
        query_embedding: queryEmbedding,
        match_threshold: matchThreshold,
        match_count: matchCount,
        p_user_id: user.id,
      })

      if (knowledge) {
        for (const kb of knowledge) {
          results.push({
            id: kb.id,
            type: 'knowledge',
            title: kb.source_title ?? 'Knowledge Note',
            content: kb.content_chunk ?? '',
            similarity: kb.similarity,
            metadata: {
              source_title: kb.source_title,
            },
          })
        }
      }
    }

    // Sort by similarity and limit
    results.sort((a, b) => b.similarity - a.similarity)
    const topResults = results.slice(0, matchCount)

    return new Response(
      JSON.stringify({
        results: topResults,
        query,
        totalResults: topResults.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('RAG query error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
