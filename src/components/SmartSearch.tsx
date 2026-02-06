import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Filter, X, Clock } from 'lucide-react';
import { semanticSearch, textSearch, getSearchHistory, saveSearchQuery } from '@/lib/search/semantic-search';
import type { SearchResult, SearchFilters } from '@/lib/search/semantic-search';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export function SmartSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMode, setSearchMode] = useState<'semantic' | 'text'>('semantic');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (query.length >= 3) {
        handleSearch();
      } else if (query.length === 0) {
        setResults([]);
      }
    }, 500);

    return () => clearTimeout(debounce);
  }, [query, filters, searchMode]);

  const loadHistory = async () => {
    const h = await getSearchHistory();
    setHistory(h);
  };

  const handleSearch = async () => {
    if (query.length < 3) return;

    setIsSearching(true);
    try {
      const searchResults = searchMode === 'semantic'
        ? await semanticSearch(query, filters)
        : await textSearch(query, filters);

      setResults(searchResults);
      await saveSearchQuery(query, searchResults.length);
      await loadHistory();
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Erro na busca');
    } finally {
      setIsSearching(false);
    }
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      idea: '💡',
      note: '📝',
      task: '✓',
      document: '📄',
    };
    return icons[type] || '📌';
  };

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-800">{part}</mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowHistory(true)}
            onBlur={() => setTimeout(() => setShowHistory(false), 200)}
            placeholder="Buscar em tudo..."
            className="pl-10 pr-10"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}

          {showHistory && history.length > 0 && (
            <Card className="absolute top-full mt-1 w-full z-50">
              <CardContent className="p-2">
                <div className="text-xs text-muted-foreground mb-2">Buscas recentes</div>
                {history.map((h, i) => (
                  <button
                    key={i}
                    onClick={() => setQuery(h)}
                    className="w-full text-left px-2 py-1 hover:bg-accent rounded flex items-center gap-2 text-sm"
                  >
                    <Clock className="h-3 w-3" />
                    {h}
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Modo de busca</h4>
                <div className="flex gap-2">
                  <Button
                    variant={searchMode === 'semantic' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSearchMode('semantic')}
                  >
                    Semântica (IA)
                  </Button>
                  <Button
                    variant={searchMode === 'text' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSearchMode('text')}
                  >
                    Texto
                  </Button>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Tipos</h4>
                <div className="space-y-2">
                  {['idea', 'note', 'task', 'document'].map((type) => (
                    <div key={type} className="flex items-center gap-2">
                      <Checkbox
                        id={type}
                        checked={filters.types?.includes(type)}
                        onCheckedChange={(checked) => {
                          const newTypes = checked
                            ? [...(filters.types || []), type]
                            : filters.types?.filter(t => t !== type) || [];
                          setFilters({ ...filters, types: newTypes.length ? newTypes : undefined });
                        }}
                      />
                      <Label htmlFor={type} className="capitalize">
                        {getTypeIcon(type)} {type}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {isSearching && (
        <div className="text-center text-muted-foreground">Buscando...</div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">
            {results.length} resultado{results.length > 1 ? 's' : ''} encontrado{results.length > 1 ? 's' : ''}
          </div>
          {results.map((result) => (
            <Card key={result.id} className="hover:bg-accent cursor-pointer transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{getTypeIcon(result.type)}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">
                        {highlightText(result.title, query)}
                      </h4>
                      <Badge variant="outline" className="capitalize">
                        {result.type}
                      </Badge>
                      {searchMode === 'semantic' && (
                        <Badge variant="secondary">
                          {Math.round(result.similarity * 100)}% match
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {highlightText(result.content, query)}
                    </p>
                    <div className="text-xs text-muted-foreground mt-2">
                      {new Date(result.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isSearching && query.length >= 3 && results.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          Nenhum resultado encontrado
        </div>
      )}
    </div>
  );
}
