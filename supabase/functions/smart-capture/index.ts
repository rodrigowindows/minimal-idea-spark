// Smart Capture Edge Function
// Processes unstructured text input using LLM and creates opportunities/logs

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { getSupabaseClient } from '../_shared/supabase.ts'
import { chatCompletion, createEmbedding } from '../_shared/openai.ts'

interface ParsedItem {
  type: 'opportunity' | 'log'
  title?: string
  description?: string
  opportunityType?: 'action' | 'study' | 'insight' | 'networking'
  suggestedDomain?: string
  priority?: number
  content?: string
  mood?: string
}

interface SmartCaptureRequest {
  input: string
}

const SYSTEM_PROMPT = `You are an AI assistant that helps organize thoughts into structured items.

Given a user's raw text input, analyze it and return a JSON array of parsed items.

Each item should be one of:
1. An OPPORTUNITY (task, action, learning goal, insight, or networking connection)
2. A LOG entry (reflection, mood update, or general journal thought)

For OPPORTUNITIES, extract:
- type: "opportunity"
- title: concise action-oriented title (max 60 chars)
- description: any additional context
- opportunityType: one of "action", "study", "insight", "networking"
- suggestedDomain: guess the life domain (Career, Health, Finance, Learning, Personal, etc.)
- priority: 1-10 based on implied urgency/importance

For LOG entries, extract:
- type: "log"
- content: the journal/reflection text
- mood: infer mood if mentioned (great, good, okay, bad, terrible)

If the input contains multiple distinct items, split them. If unclear, treat as a single log entry.

Return ONLY valid JSON array, no explanation.`

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

    const { input }: SmartCaptureRequest = await req.json()

    if (!input || typeof input !== 'string' || input.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Input text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use LLM to parse the input
    const parseResponse = await chatCompletion(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: input },
      ],
      { temperature: 0.3 }
    )

    let parsedItems: ParsedItem[]
    try {
      parsedItems = JSON.parse(parseResponse)
    } catch {
      // If parsing fails, treat as a simple log entry
      parsedItems = [{ type: 'log', content: input }]
    }

    // Get user's domains for matching
    const { data: domains } = await supabase
      .from('life_domains')
      .select('id, name')
      .eq('user_id', user.id)

    const domainMap = new Map(domains?.map(d => [d.name.toLowerCase(), d.id]) ?? [])

    const createdItems: Array<{ type: string; id: string; title?: string }> = []

    for (const item of parsedItems) {
      if (item.type === 'opportunity' && item.title) {
        // Create embedding for semantic search
        const textForEmbedding = `${item.title}. ${item.description ?? ''}`
        const embedding = await createEmbedding(textForEmbedding)

        // Find matching domain
        const domainId = item.suggestedDomain
          ? domainMap.get(item.suggestedDomain.toLowerCase()) ?? null
          : null

        const { data: opp, error } = await supabase
          .from('opportunities')
          .insert({
            user_id: user.id,
            title: item.title,
            description: item.description,
            type: item.opportunityType ?? 'action',
            status: 'backlog',
            priority: item.priority ?? 5,
            domain_id: domainId,
            embedding,
          })
          .select('id')
          .single()

        if (!error && opp) {
          createdItems.push({ type: 'opportunity', id: opp.id, title: item.title })
        }
      } else if (item.type === 'log' && item.content) {
        // Create embedding for log
        const embedding = await createEmbedding(item.content)

        const { data: log, error } = await supabase
          .from('daily_logs')
          .insert({
            user_id: user.id,
            content: item.content,
            mood: item.mood,
            embedding,
          })
          .select('id')
          .single()

        if (!error && log) {
          createdItems.push({ type: 'log', id: log.id })
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        created: createdItems,
        message: `Created ${createdItems.length} item(s)`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Smart capture error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
