import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, user_id, context, priorities } = await req.json();

    if (action === 'reevaluate') {
      // Reevaluate priorities using AI
      const prioritiesText = priorities.map((p: any) =>
        `- ${p.title}: ${p.description} (Current level: ${p.priority_level})`
      ).join('\n');

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a priority assessment AI. Analyze user priorities and suggest appropriate priority levels (critical, high, medium, low) based on urgency, impact, and dependencies.',
            },
            {
              role: 'user',
              content: `Reevaluate these priorities:\n${prioritiesText}\n\nRespond with JSON array of {id, priority_level}`,
            },
          ],
        }),
      });

      const result = await response.json();
      const updated_priorities = JSON.parse(result.choices[0].message.content);

      return new Response(
        JSON.stringify({ updated_priorities }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Suggest actions based on priorities
    const prioritiesText = priorities.map((p: any) =>
      `- [${p.priority_level}] ${p.title}: ${p.description}`
    ).join('\n');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a productivity AI assistant. Suggest 3-5 specific, actionable next steps based on user priorities. Be concise and practical.',
          },
          {
            role: 'user',
            content: `User priorities:\n${prioritiesText}\n\nCurrent context: ${context}\n\nSuggest actionable next steps.`,
          },
        ],
      }),
    });

    const result = await response.json();
    const suggestions = result.choices[0].message.content
      .split('\n')
      .filter((s: string) => s.trim().length > 0)
      .map((s: string) => s.replace(/^\d+\.\s*/, '').replace(/^-\s*/, ''));

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
