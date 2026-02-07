import { supabase } from '@/integrations/supabase/client';

export interface ContentGenerationOptions {
  prompt: string;
  context?: string;
  style?: 'professional' | 'casual' | 'creative' | 'technical';
  tone?: 'formal' | 'friendly' | 'enthusiastic' | 'neutral';
  length?: 'short' | 'medium' | 'long';
  language?: string;
}

export interface GeneratedContent {
  id: string;
  content: string;
  prompt: string;
  metadata: ContentGenerationOptions;
  rating?: number;
  created_at: string;
}

export async function generateContent(
  options: ContentGenerationOptions
): Promise<string> {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-content`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify(options),
    }
  );

  if (!response.ok) throw new Error('Content generation failed');

  const data = await response.json();
  return data.content;
}

export async function expandTopic(topic: string, context?: string): Promise<string[]> {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-content`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify({
        action: 'expand',
        topic,
        context,
      }),
    }
  );

  const data = await response.json();
  return data.ideas || [];
}

export async function refineContent(
  content: string,
  feedback: string
): Promise<string> {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-content`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify({
        action: 'refine',
        content,
        feedback,
      }),
    }
  );

  const data = await response.json();
  return data.content;
}

export async function generateTitleAndDescription(
  content: string
): Promise<{ title: string; description: string }> {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-content`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify({
        action: 'generate_metadata',
        content,
      }),
    }
  );

  const data = await response.json();
  return {
    title: data.title,
    description: data.description,
  };
}

export async function saveGeneratedContent(
  content: string,
  options: ContentGenerationOptions
): Promise<GeneratedContent> {
  const { data, error } = await (supabase as any)
    .from('generated_content')
    .insert({
      content,
      prompt: options.prompt,
      metadata: options,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getGenerationHistory(limit = 20): Promise<GeneratedContent[]> {
  const { data, error } = await (supabase as any)
    .from('generated_content')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function rateGeneration(id: string, rating: number): Promise<void> {
  const { error } = await (supabase as any)
    .from('generated_content')
    .update({ rating })
    .eq('id', id);

  if (error) throw error;
}
