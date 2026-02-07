import { supabase } from '@/integrations/supabase/client';
import { localSearch, loadSearchIndex, getSuggestions as getLocalSuggestions } from './indexer';
import type { IndexedItem, LocalSearchFilters } from './indexer';

export interface SearchResult {
  id: string;
  type: 'idea' | 'note' | 'task' | 'document' | 'opportunity' | 'journal' | 'calendar' | 'knowledge' | 'goal' | 'habit';
  title: string;
  content: string;
  similarity: number;
  metadata?: Record<string, any>;
  created_at: string;
  tags?: string[];
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
    console.error('Semantic search error, falling back to local search:', error);
    return localFallbackSearch(query, filters);
  }
}

export async function textSearch(
  query: string,
  filters?: SearchFilters
): Promise<SearchResult[]> {
  try {
    let queryBuilder = (supabase as any)
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
  } catch (error) {
    console.error('Text search error, falling back to local search:', error);
    return localFallbackSearch(query, filters);
  }
}

function localFallbackSearch(query: string, filters?: SearchFilters): SearchResult[] {
  const index = loadSearchIndex();
  const localFilters: LocalSearchFilters = {
    types: filters?.types,
    dateFrom: filters?.dateFrom?.toISOString(),
    dateTo: filters?.dateTo?.toISOString(),
    tags: filters?.tags,
  };

  const localResults = localSearch(index, query, localFilters);

  return localResults.map(item => ({
    id: item.id,
    type: item.type as SearchResult['type'],
    title: item.title,
    content: item.content,
    similarity: item.relevance,
    metadata: item.metadata,
    created_at: item.created_at,
    tags: item.tags,
  }));
}

export function searchLocal(query: string, filters?: SearchFilters): SearchResult[] {
  return localFallbackSearch(query, filters);
}

export async function saveSearchQuery(query: string, resultsCount: number) {
  // Save to localStorage history
  saveSearchToLocalHistory(query);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await (supabase as any).from('search_history').insert({
      user_id: user.id,
      query,
      results_count: resultsCount,
      created_at: new Date().toISOString(),
    });
  } catch {
    // Silently fail for remote save
  }
}

const SEARCH_HISTORY_KEY = 'lifeos_search_history';
const MAX_HISTORY = 20;

function saveSearchToLocalHistory(query: string) {
  try {
    const history = getLocalSearchHistory();
    const filtered = history.filter(h => h !== query);
    filtered.unshift(query);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(filtered.slice(0, MAX_HISTORY)));
  } catch { /* ignore */ }
}

function getLocalSearchHistory(): string[] {
  try {
    const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return [];
}

export async function getSearchHistory(limit = 10): Promise<string[]> {
  // Try remote first, fallback to local
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await (supabase as any)
        .from('search_history')
        .select('query')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (data && data.length > 0) {
        return data.map((h: any) => h.query);
      }
    }
  } catch { /* fallback to local */ }

  return getLocalSearchHistory().slice(0, limit);
}

export async function getSuggestedSearches(query: string): Promise<string[]> {
  if (query.length < 2) return [];

  // Try remote suggestions
  try {
    const { data } = await (supabase as any)
      .from('search_history')
      .select('query')
      .ilike('query', `${query}%`)
      .limit(5);

    if (data && data.length > 0) {
      return data.map((h: any) => h.query);
    }
  } catch { /* fallback to local */ }

  // Local suggestions from index
  const index = loadSearchIndex();
  const localSuggs = getLocalSuggestions(index, query, 5);

  // Also check local history
  const history = getLocalSearchHistory();
  const historySuggs = history
    .filter(h => h.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 3);

  // Merge, deduplicate
  const merged = [...new Set([...historySuggs, ...localSuggs])];
  return merged.slice(0, 5);
}
