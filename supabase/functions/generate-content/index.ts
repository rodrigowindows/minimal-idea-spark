import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { action, prompt, context, style, tone, length, topic, content, feedback } = body;

    let systemPrompt = 'You are a professional content writer and AI assistant.';
    let userPrompt = '';
    let temperature = 0.7;

    if (action === 'expand') {
      systemPrompt = 'You are a creative brainstorming assistant. Generate diverse, actionable ideas.';
      userPrompt = `Generate 5-7 creative ideas to expand on this topic: ${topic}${context ? `\n\nContext: ${context}` : ''}\n\nProvide ideas as a JSON array of strings.`;
      temperature = 0.8;
    } else if (action === 'refine') {
      systemPrompt = 'You are an expert editor. Improve clarity, structure, and impact while preserving the original meaning and intent.';
      userPrompt = `Refine this content based on the feedback:\n\nContent: ${content}\n\nFeedback: ${feedback}`;
    } else if (action === 'generate_metadata') {
      systemPrompt = 'You are a metadata generation specialist. Generate compelling, SEO-friendly titles and descriptions.';
      userPrompt = `Generate a compelling title and brief description for this content:\n\n${content}\n\nRespond with JSON: {"title": "...", "description": "..."}`;
    } else if (action === 'suggest') {
      systemPrompt = 'You are a writing assistant. Provide contextual suggestions to help complete or improve the text being written. Be concise and practical.';
      userPrompt = `Based on this partial text, suggest 3-5 ways to continue or improve it:\n\n${content}${context ? `\n\nContext: ${context}` : ''}\n\nRespond with JSON: {"suggestions": ["...", "...", "..."]}`;
      temperature = 0.8;
    } else {
      // Default content generation
      const styleGuides: Record<string, string> = {
        professional: 'Use clear, authoritative language with proper structure.',
        casual: 'Use conversational, approachable language.',
        creative: 'Use imaginative, engaging language with vivid descriptions.',
        technical: 'Use precise, technical language with accurate terminology.',
      };

      const toneGuides: Record<string, string> = {
        formal: 'Maintain a formal, respectful tone.',
        friendly: 'Be warm and personable.',
        enthusiastic: 'Show excitement and energy.',
        neutral: 'Stay objective and balanced.',
      };

      const lengthGuides: Record<string, string> = {
        short: '1-2 paragraphs (100-200 words)',
        medium: '3-5 paragraphs (300-500 words)',
        long: '6+ paragraphs (600-1000 words)',
      };

      const styleGuide = styleGuides[style as string] || styleGuides.professional;
      const toneGuide = toneGuides[tone as string] || toneGuides.neutral;
      const lengthGuide = lengthGuides[length as string] || lengthGuides.medium;

      systemPrompt = `You are a professional content writer. ${styleGuide} ${toneGuide} Target length: ${lengthGuide}`;
      userPrompt = prompt;
      if (context) userPrompt += `\n\nContext: ${context}`;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature,
      }),
    });

    if (!response.ok) {
      throw new Error('OpenAI API request failed');
    }

    const result = await response.json();
    const generatedText = result.choices[0].message.content;

    if (action === 'expand') {
      try {
        const ideas = JSON.parse(generatedText);
        return new Response(
          JSON.stringify({ ideas }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch {
        // If JSON parsing fails, split by newlines
        const ideas = generatedText.split('\n').filter((l: string) => l.trim());
        return new Response(
          JSON.stringify({ ideas }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (action === 'generate_metadata') {
      try {
        const metadata = JSON.parse(generatedText);
        return new Response(
          JSON.stringify(metadata),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch {
        return new Response(
          JSON.stringify({ title: 'Untitled', description: generatedText.substring(0, 200) }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (action === 'suggest') {
      try {
        const parsed = JSON.parse(generatedText);
        return new Response(
          JSON.stringify({ suggestions: parsed.suggestions || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch {
        const suggestions = generatedText.split('\n').filter((l: string) => l.trim()).slice(0, 5);
        return new Response(
          JSON.stringify({ suggestions }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ content: generatedText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
