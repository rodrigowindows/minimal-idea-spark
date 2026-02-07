import { supabase } from '@/integrations/supabase/client';

export interface ContentGenerationOptions {
  prompt: string;
  context?: string;
  style?: 'professional' | 'casual' | 'creative' | 'technical';
  tone?: 'formal' | 'friendly' | 'enthusiastic' | 'neutral';
  length?: 'short' | 'medium' | 'long';
  language?: string;
  templateId?: string;
}

export interface GeneratedContent {
  id: string;
  content: string;
  prompt: string;
  metadata: ContentGenerationOptions;
  rating?: number;
  created_at: string;
}

async function getAuthHeaders() {
  const session = (await supabase.auth.getSession()).data.session;
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token}`,
  };
}

async function callGenerateContent(body: Record<string, unknown>): Promise<any> {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-content`,
    {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Content generation failed');
  }

  return response.json();
}

export async function generateContent(
  options: ContentGenerationOptions
): Promise<string> {
  const data = await callGenerateContent(options);
  return data.content;
}

export async function expandTopic(topic: string, context?: string): Promise<string[]> {
  const data = await callGenerateContent({
    action: 'expand',
    topic,
    context,
  });
  return data.ideas || [];
}

export async function refineContent(
  content: string,
  feedback: string
): Promise<string> {
  const data = await callGenerateContent({
    action: 'refine',
    content,
    feedback,
  });
  return data.content;
}

export async function generateTitleAndDescription(
  content: string
): Promise<{ title: string; description: string }> {
  const data = await callGenerateContent({
    action: 'generate_metadata',
    content,
  });
  return {
    title: data.title,
    description: data.description,
  };
}

export async function generateSuggestions(
  partialText: string,
  context?: string
): Promise<string[]> {
  const data = await callGenerateContent({
    action: 'suggest',
    content: partialText,
    context,
  });
  return data.suggestions || [];
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
