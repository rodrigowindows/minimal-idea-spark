// Generate Embedding Edge Function
// Creates vector embeddings for text content

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { getSupabaseClient } from '../_shared/supabase.ts'
import { createEmbedding } from '../_shared/openai.ts'

interface EmbeddingRequest {
  text: string
  table: 'opportunities' | 'daily_logs' | 'knowledge_base'
  id: string
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

    const { text, table, id }: EmbeddingRequest = await req.json()

    if (!text || !table || !id) {
      return new Response(
        JSON.stringify({ error: 'text, table, and id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate table name
    const validTables = ['opportunities', 'daily_logs', 'knowledge_base']
    if (!validTables.includes(table)) {
      return new Response(
        JSON.stringify({ error: 'Invalid table name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate embedding
    const embedding = await createEmbedding(text)

    // Update the record with the embedding
    const { error: updateError } = await supabase
      .from(table)
      .update({ embedding })
      .eq('id', id)
      .eq('user_id', user.id)

    if (updateError) {
      throw updateError
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Embedding generated and stored for ${table}:${id}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Generate embedding error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
