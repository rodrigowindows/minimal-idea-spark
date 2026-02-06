import { supabase } from '@/lib/audio-transcription';

export interface Priority {
  id: string;
  user_id: string;
  title: string;
  description: string;
  priority_level: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  due_date?: string;
  status: 'active' | 'completed' | 'archived';
  embedding?: number[];
  created_at: string;
  updated_at: string;
}

export interface GoalContext {
  priorities: Priority[];
  activeGoals: string[];
  recentActions: string[];
  userPreferences: Record<string, any>;
}

export async function getUserPriorities(userId: string): Promise<Priority[]> {
  const { data, error } = await supabase
    .from('user_priorities')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('priority_level', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function buildPriorityContext(userId: string): Promise<string> {
  const priorities = await getUserPriorities(userId);

  if (priorities.length === 0) {
    return 'No active priorities set.';
  }

  const context = priorities.map((p, i) => {
    return `${i + 1}. [${p.priority_level.toUpperCase()}] ${p.title}: ${p.description}`;
  }).join('\n');

  return `Current User Priorities:\n${context}\n\nAlways consider these priorities when providing suggestions or taking actions.`;
}

export async function addPriority(
  userId: string,
  priority: Omit<Priority, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<Priority> {
  const { data, error } = await supabase
    .from('user_priorities')
    .insert({
      user_id: userId,
      ...priority,
    })
    .select()
    .single();

  if (error) throw error;

  // Generate embedding for priority
  await generatePriorityEmbedding(data.id, `${priority.title} ${priority.description}`);

  return data;
}

export async function generatePriorityEmbedding(priorityId: string, text: string) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-embedding`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ text }),
      }
    );

    const { embedding } = await response.json();

    await supabase
      .from('user_priorities')
      .update({ embedding })
      .eq('id', priorityId);
  } catch (error) {
    console.error('Error generating priority embedding:', error);
  }
}

export async function suggestActionsBasedOnPriorities(
  userId: string,
  currentContext: string
): Promise<string[]> {
  const priorities = await getUserPriorities(userId);

  if (priorities.length === 0) return [];

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rag-priority`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify({
        user_id: userId,
        context: currentContext,
        priorities,
      }),
    }
  );

  const data = await response.json();
  return data.suggestions || [];
}

export async function reevaluatePriorities(userId: string): Promise<void> {
  const priorities = await getUserPriorities(userId);

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rag-priority`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify({
        action: 'reevaluate',
        user_id: userId,
        priorities,
      }),
    }
  );

  const { updated_priorities } = await response.json();

  for (const priority of updated_priorities) {
    await supabase
      .from('user_priorities')
      .update({
        priority_level: priority.priority_level,
        updated_at: new Date().toISOString(),
      })
      .eq('id', priority.id);
  }
}
