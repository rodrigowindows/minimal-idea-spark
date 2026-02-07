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

    const { action, user_id, context, priorities, objectives } = await req.json();

    if (action === 'reevaluate') {
      // Reevaluate priorities using AI with full context
      const prioritiesText = priorities.map((p: any) =>
        `- [id:${p.id}] ${p.title}: ${p.description} (Level: ${p.priority_level}, Progress: ${p.progress ?? 0}%, Category: ${p.category}${p.due_date ? `, Due: ${p.due_date}` : ''}${p.key_results?.length > 0 ? `, KRs: ${p.key_results.map((kr: any) => `${kr.title}: ${kr.current}/${kr.target}`).join('; ')}` : ''})`
      ).join('\n');

      const objectivesText = objectives?.length > 0
        ? `\n\nUser's persistent objectives:\n${objectives.map((o: string, i: number) => `${i + 1}. ${o}`).join('\n')}`
        : '';

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
              content: `You are a priority assessment AI for a life management app. Analyze user priorities considering urgency, impact, alignment with objectives, due dates, progress, and key results.

Respond ONLY with a JSON array: [{"id": "...", "priority_level": "critical|high|medium|low", "reasoning": "..."}]
Only include priorities that should change level.`,
            },
            {
              role: 'user',
              content: `Reevaluate these priorities:\n${prioritiesText}${objectivesText}\n\nToday: ${new Date().toISOString().split('T')[0]}`,
            },
          ],
          temperature: 0.3,
        }),
      });

      const result = await response.json();
      let updated_priorities;
      try {
        const content = result.choices[0].message.content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
        updated_priorities = JSON.parse(content);
      } catch {
        updated_priorities = [];
      }

      return new Response(
        JSON.stringify({ updated_priorities }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'suggest_actions') {
      // Suggest specific next actions based on priorities and objectives
      const prioritiesText = priorities.map((p: any) =>
        `- [${p.priority_level}] ${p.title}: ${p.description} (${p.progress ?? 0}%${p.key_results?.length > 0 ? `, KRs: ${p.key_results.map((kr: any) => `${kr.title}: ${kr.current}/${kr.target}`).join('; ')}` : ''})`
      ).join('\n');

      const objectivesText = objectives?.length > 0
        ? `\n\nUser's core objectives:\n${objectives.join('\n')}`
        : '';

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
              content: `You are a productivity AI for a life OS. Generate 3-5 specific, actionable next steps aligned with priorities and objectives. Respond with a JSON array of strings.`,
            },
            {
              role: 'user',
              content: `Priorities:\n${prioritiesText}${objectivesText}\n\nContext: ${context || 'Dashboard'}\nDate: ${new Date().toISOString().split('T')[0]}`,
            },
          ],
          temperature: 0.5,
        }),
      });

      const result = await response.json();
      let suggestions;
      try {
        const content = result.choices[0].message.content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
        suggestions = JSON.parse(content);
      } catch {
        suggestions = result.choices[0].message.content
          .split('\n')
          .filter((s: string) => s.trim().length > 0)
          .map((s: string) => s.replace(/^\d+\.\s*/, '').replace(/^-\s*/, ''));
      }

      return new Response(
        JSON.stringify({ suggestions }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Default: suggest actions (backward compatible)
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
            content: 'You are a productivity AI. Suggest 3-5 specific, actionable next steps based on user priorities. Respond with a JSON array of strings.',
          },
          {
            role: 'user',
            content: `Priorities:\n${prioritiesText}\n\nContext: ${context}\n\nSuggest actionable next steps.`,
          },
        ],
        temperature: 0.5,
      }),
    });

    const result = await response.json();
    let suggestions;
    try {
      const content = result.choices[0].message.content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      suggestions = JSON.parse(content);
    } catch {
      suggestions = result.choices[0].message.content
        .split('\n')
        .filter((s: string) => s.trim().length > 0)
        .map((s: string) => s.replace(/^\d+\.\s*/, '').replace(/^-\s*/, ''));
    }

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
