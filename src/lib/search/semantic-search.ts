import { supabase } from '@/lib/audio-transcription';

export interface SearchResult {
  id: string;
  type: 'idea' | 'note' | 'task' | 'document';
  title: string;
  content: string;
  similarity: number;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface SearchFilters {
  types?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  tags?: string[];
  author?: string;
}

export async function semanticSearch(
  query: string,
  filters?: SearchFilters,
  limit = 20
): Promise<SearchResult[]> {
  try {
    // Generate embedding for query
    const embeddingResponse = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-embedding`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ text: query }),
      }
    );

    const { embedding } = await embeddingResponse.json();

    // Search using vector similarity
    const searchResponse = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vector-search`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          embedding,
          filters,
          limit,
        }),
      }
    );

    const { results } = await searchResponse.json();
    return results;
  } catch (error) {
    console.error('Semantic search error:', error);
    throw error;
  }
}

export async function textSearch(
  query: string,
  filters?: SearchFilters
): Promise<SearchResult[]> {
  let queryBuilder = supabase
    .from('searchable_content')
    .select('*')
    .textSearch('content', query, { type: 'websearch' });

  if (filters?.types) {
    queryBuilder = queryBuilder.in('type', filters.types);
  }

  if (filters?.dateFrom) {
    queryBuilder = queryBuilder.gte('created_at', filters.dateFrom.toISOString());
  }

  if (filters?.dateTo) {
    queryBuilder = queryBuilder.lte('created_at', filters.dateTo.toISOString());
  }

  if (filters?.tags) {
    queryBuilder = queryBuilder.contains('tags', filters.tags);
  }

  const { data, error } = await queryBuilder.limit(50);

  if (error) throw error;
  return data || [];
}

export async function saveSearchQuery(query: string, resultsCount: number) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('search_history').insert({
    user_id: user.id,
    query,
    results_count: resultsCount,
    created_at: new Date().toISOString(),
  });
}

export async function getSearchHistory(limit = 10): Promise<string[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('search_history')
    .select('query')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  return data?.map(h => h.query) || [];
}

export async function getSuggestedSearches(query: string): Promise<string[]> {
  if (query.length < 2) return [];

  const { data } = await supabase
    .from('search_history')
    .select('query')
    .ilike('query', `${query}%`)
    .limit(5);

  return data?.map(h => h.query) || [];
}
