import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, prompt, context, style, tone, length, topic, content, feedback } = body;

    let systemPrompt = 'You are a professional content writer and AI assistant.';
    let userPrompt = '';

    if (action === 'expand') {
      systemPrompt = 'You are a creative brainstorming assistant. Generate diverse, actionable ideas.';
      userPrompt = `Generate 5-7 creative ideas to expand on this topic: ${topic}${context ? `\n\nContext: ${context}` : ''}\n\nProvide ideas as a JSON array of strings.`;
    } else if (action === 'refine') {
      systemPrompt = 'You are an expert editor. Improve clarity, structure, and impact.';
      userPrompt = `Refine this content based on the feedback:\n\nContent: ${content}\n\nFeedback: ${feedback}`;
    } else if (action === 'generate_metadata') {
      systemPrompt = 'You are a metadata generation specialist.';
      userPrompt = `Generate a compelling title and brief description for this content:\n\n${content}\n\nRespond with JSON: {"title": "...", "description": "..."}`;
    } else {
      // Default content generation
      const styleGuide = {
        professional: 'Use clear, authoritative language with proper structure.',
        casual: 'Use conversational, approachable language.',
        creative: 'Use imaginative, engaging language with vivid descriptions.',
        technical: 'Use precise, technical language with accurate terminology.',
      }[style || 'professional'];

      const toneGuide = {
        formal: 'Maintain a formal, respectful tone.',
        friendly: 'Be warm and personable.',
        enthusiastic: 'Show excitement and energy.',
        neutral: 'Stay objective and balanced.',
      }[tone || 'neutral'];

      const lengthGuide = {
        short: '1-2 paragraphs (100-200 words)',
        medium: '3-5 paragraphs (300-500 words)',
        long: '6+ paragraphs (600-1000 words)',
      }[length || 'medium'];

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
        temperature: action === 'expand' ? 0.8 : 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error('OpenAI API request failed');
    }

    const result = await response.json();
    const generatedText = result.choices[0].message.content;

    if (action === 'expand') {
      const ideas = JSON.parse(generatedText);
      return new Response(
        JSON.stringify({ ideas }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (action === 'generate_metadata') {
      const metadata = JSON.parse(generatedText);
      return new Response(
        JSON.stringify(metadata),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ content: generatedText }),
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
