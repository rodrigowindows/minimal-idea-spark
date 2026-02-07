import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  semanticSearch,
  textSearch,
  searchLocal,
  getSearchHistory,
  getSuggestedSearches,
  saveSearchQuery,
} from '@/lib/search/semantic-search';
import type { SearchResult, SearchFilters } from '@/lib/search/semantic-search';
import { buildSearchIndex, saveSearchIndex } from '@/lib/search/indexer';
import { useLocalData } from '@/hooks/useLocalData';

export type SearchMode = 'local' | 'semantic' | 'text';

export interface UseSearchOptions {
  debounceMs?: number;
  minQueryLength?: number;
  autoIndex?: boolean;
}

export function useSearch(options: UseSearchOptions = {}) {
  const {
    debounceMs = 300,
    minQueryLength = 2,
    autoIndex = true,
  } = options;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMode, setSearchMode] = useState<SearchMode>('local');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [history, setHistory] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [totalResults, setTotalResults] = useState(0);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const suggestRef = useRef<ReturnType<typeof setTimeout>>();
  const { opportunities, dailyLogs, goals, habits } = useLocalData();

  // Build and save search index when data changes
  useEffect(() => {
    if (!autoIndex) return;

    let calendarEvents: any[] = [];
    try {
      const stored = localStorage.getItem('lifeos_calendar_events');
      if (stored) calendarEvents = JSON.parse(stored);
    } catch { /* ignore */ }

    const index = buildSearchIndex({
      opportunities,
      dailyLogs,
      calendarEvents,
      goals,
      habits,
    });
    saveSearchIndex(index);
  }, [opportunities, dailyLogs, goals, habits, autoIndex]);

  // Load search history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = useCallback(async () => {
    const h = await getSearchHistory();
    setHistory(h);
  }, []);

  // Suggestions as user types
  useEffect(() => {
    if (suggestRef.current) clearTimeout(suggestRef.current);

    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    suggestRef.current = setTimeout(async () => {
      const suggs = await getSuggestedSearches(query);
      setSuggestions(suggs);
    }, 150);

    return () => {
      if (suggestRef.current) clearTimeout(suggestRef.current);
    };
  }, [query]);

  // Debounced search as user types
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length < minQueryLength) {
      setResults([]);
      setTotalResults(0);
      return;
    }

    debounceRef.current = setTimeout(() => {
      executeSearch();
    }, debounceMs);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, filters, searchMode]);

  const executeSearch = useCallback(async () => {
    if (query.length < minQueryLength) return;

    setIsSearching(true);
    try {
      let searchResults: SearchResult[];

      if (searchMode === 'local') {
        searchResults = searchLocal(query, filters);
      } else if (searchMode === 'semantic') {
        searchResults = await semanticSearch(query, filters);
      } else {
        searchResults = await textSearch(query, filters);
      }

      setResults(searchResults);
      setTotalResults(searchResults.length);
      await saveSearchQuery(query, searchResults.length);
      await loadHistory();
    } catch (error) {
      console.error('Search error:', error);
      // Fallback to local search on any error
      const localResults = searchLocal(query, filters);
      setResults(localResults);
      setTotalResults(localResults.length);
    } finally {
      setIsSearching(false);
    }
  }, [query, filters, searchMode, minQueryLength, loadHistory]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setSuggestions([]);
    setTotalResults(0);
  }, []);

  const clearHistory = useCallback(() => {
    try {
      localStorage.removeItem('lifeos_search_history');
    } catch { /* ignore */ }
    setHistory([]);
  }, []);

  const updateFilters = useCallback((newFilters: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({});
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.types && filters.types.length > 0) count++;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    if (filters.tags && filters.tags.length > 0) count++;
    return count;
  }, [filters]);

  return {
    // State
    query,
    setQuery,
    results,
    isSearching,
    searchMode,
    setSearchMode,
    filters,
    history,
    suggestions,
    totalResults,
    activeFilterCount,

    // Actions
    executeSearch,
    clearSearch,
    clearHistory,
    updateFilters,
    resetFilters,
  };
}
