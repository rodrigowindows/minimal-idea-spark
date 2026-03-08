import { supabase } from '@/integrations/supabase/client';
import { localSearch, loadSearchIndex, getSuggestions as getLocalSuggestions } from './indexer';
import type { LocalSearchFilters } from './indexer';

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

/**
 * Primary search — uses local index with keyword matching.
 * Semantic/vector search was removed (embeddings were placeholder).
 */
export function semanticSearch(
  query: string,
  filters?: SearchFilters,
): Promise<SearchResult[]> {
  return Promise.resolve(localFallbackSearch(query, filters));
}

export function textSearch(
  query: string,
  filters?: SearchFilters,
): Promise<SearchResult[]> {
  return Promise.resolve(localFallbackSearch(query, filters));
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

/** When true, skip remote search_history (table missing or 404). */
let searchHistoryRemoteDisabled = false;

function markSearchHistoryRemoteDisabled() {
  searchHistoryRemoteDisabled = true;
}

export async function saveSearchQuery(query: string, _resultsCount: number) {
  saveSearchToLocalHistory(query);

  if (searchHistoryRemoteDisabled) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await (supabase as any).from('search_history').insert({
      user_id: user.id,
      query,
      created_at: new Date().toISOString(),
    });
    if (error && (error.code === 'PGRST116' || error.message?.includes('404') || (error as any).status === 404)) markSearchHistoryRemoteDisabled();
  } catch {
    markSearchHistoryRemoteDisabled();
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
  if (!searchHistoryRemoteDisabled) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await (supabase as any)
          .from('search_history')
          .select('query')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error && (error.code === 'PGRST116' || error.message?.includes('404') || (error as any).status === 404)) markSearchHistoryRemoteDisabled();
        else if (data && data.length > 0) return data.map((h: any) => h.query);
      }
    } catch {
      markSearchHistoryRemoteDisabled();
    }
  }
  return getLocalSearchHistory().slice(0, limit);
}

export async function getSuggestedSearches(query: string): Promise<string[]> {
  if (query.length < 2) return [];

  if (!searchHistoryRemoteDisabled) {
    try {
      const { data, error } = await (supabase as any)
        .from('search_history')
        .select('query')
        .ilike('query', `${query}%`)
        .limit(5);

      if (error && (error.code === 'PGRST116' || error.message?.includes('404') || (error as any).status === 404)) markSearchHistoryRemoteDisabled();
      else if (data && data.length > 0) return data.map((h: any) => h.query);
    } catch {
      markSearchHistoryRemoteDisabled();
    }
  }

  const index = loadSearchIndex();
  const localSuggs = getLocalSuggestions(index, query, 5);
  const history = getLocalSearchHistory();
  const historySuggs = history
    .filter(h => h.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 3);

  const merged = [...new Set([...historySuggs, ...localSuggs])];
  return merged.slice(0, 5);
}