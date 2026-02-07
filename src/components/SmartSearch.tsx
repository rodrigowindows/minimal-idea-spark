import { useState, useRef, useEffect, Fragment } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Filter, X, Clock, Sparkles, Type, Zap, Trash2 } from 'lucide-react';
import { useSearch } from '@/hooks/useSearch';
import type { SearchMode } from '@/hooks/useSearch';
import type { SearchResult } from '@/lib/search/semantic-search';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

const CONTENT_TYPES = [
  { value: 'opportunity', label: 'Oportunidades', icon: '🎯' },
  { value: 'journal', label: 'Diário', icon: '📝' },
  { value: 'calendar', label: 'Calendário', icon: '📅' },
  { value: 'goal', label: 'Metas', icon: '🏆' },
  { value: 'habit', label: 'Hábitos', icon: '🔄' },
  { value: 'knowledge', label: 'Conhecimento', icon: '📚' },
];

const SEARCH_MODES: { value: SearchMode; label: string; icon: typeof Search }[] = [
  { value: 'local', label: 'Local', icon: Zap },
  { value: 'semantic', label: 'Semântica (IA)', icon: Sparkles },
  { value: 'text', label: 'Texto', icon: Type },
];

function getTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    opportunity: '🎯',
    journal: '📝',
    calendar: '📅',
    goal: '🏆',
    habit: '🔄',
    knowledge: '📚',
    idea: '💡',
    note: '📝',
    task: '✓',
    document: '📄',
  };
  return icons[type] || '📌';
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    opportunity: 'Oportunidade',
    journal: 'Diário',
    calendar: 'Evento',
    goal: 'Meta',
    habit: 'Hábito',
    knowledge: 'Conhecimento',
    idea: 'Ideia',
    note: 'Nota',
    task: 'Tarefa',
    document: 'Documento',
  };
  return labels[type] || type;
}

function highlightText(text: string, query: string) {
  if (!query || query.length < 2) return text;
  try {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">{part}</mark>
      ) : (
        <Fragment key={i}>{part}</Fragment>
      )
    );
  } catch {
    return text;
  }
}

function truncateContent(content: string, maxLength = 150): string {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength) + '...';
}

function ResultCard({ result, query, searchMode }: { result: SearchResult; query: string; searchMode: SearchMode }) {
  return (
    <Card className="hover:bg-accent/50 cursor-pointer transition-colors border-l-4" style={{
      borderLeftColor: result.metadata?.domain_color || result.metadata?.color || 'hsl(var(--primary))',
    }}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <span className="text-xl mt-0.5">{getTypeIcon(result.type)}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h4 className="font-semibold text-sm truncate">
                {highlightText(result.title, query)}
              </h4>
              <Badge variant="outline" className="text-xs shrink-0">
                {getTypeLabel(result.type)}
              </Badge>
              {result.metadata?.status && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  {result.metadata.status}
                </Badge>
              )}
              {result.similarity > 0 && searchMode !== 'text' && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  {Math.round(result.similarity * 100)}%
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {highlightText(truncateContent(result.content), query)}
            </p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-muted-foreground">
                {new Date(result.created_at).toLocaleDateString('pt-BR')}
              </span>
              {result.metadata?.domain && (
                <span className="text-xs text-muted-foreground">
                  {result.metadata.domain}
                </span>
              )}
              {result.metadata?.mood && (
                <span className="text-xs text-muted-foreground">
                  Humor: {result.metadata.mood}
                </span>
              )}
              {result.metadata?.priority && (
                <span className="text-xs text-muted-foreground">
                  P{result.metadata.priority}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SmartSearch() {
  const {
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
    clearSearch,
    clearHistory,
    updateFilters,
    resetFilters,
  } = useSearch({ debounceMs: 300, minQueryLength: 2 });

  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const dropdownItems = query.length >= 2 ? suggestions : history;
  const dropdownLabel = query.length >= 2 ? 'Sugestões' : 'Buscas recentes';

  return (
    <div className="space-y-4">
      {/* Search input row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowDropdown(true)}
            placeholder="Buscar em tudo..."
            className="pl-10 pr-10"
          />
          {query && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}

          {/* Dropdown: suggestions or history */}
          {showDropdown && dropdownItems.length > 0 && (
            <Card className="absolute top-full mt-1 w-full z-50 shadow-lg" ref={dropdownRef}>
              <CardContent className="p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">{dropdownLabel}</span>
                  {query.length < 2 && history.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearHistory();
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      Limpar
                    </button>
                  )}
                </div>
                {dropdownItems.map((item, i) => (
                  <button
                    key={i}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setQuery(item);
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-2 py-1.5 hover:bg-accent rounded flex items-center gap-2 text-sm"
                  >
                    {query.length >= 2 ? (
                      <Search className="h-3 w-3 text-muted-foreground" />
                    ) : (
                      <Clock className="h-3 w-3 text-muted-foreground" />
                    )}
                    {item}
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Filter popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="relative">
              <Filter className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              {/* Search mode */}
              <div>
                <h4 className="font-semibold text-sm mb-2">Modo de busca</h4>
                <div className="flex gap-1.5 flex-wrap">
                  {SEARCH_MODES.map(mode => (
                    <Button
                      key={mode.value}
                      variant={searchMode === mode.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSearchMode(mode.value)}
                      className="text-xs h-7"
                    >
                      <mode.icon className="h-3 w-3 mr-1" />
                      {mode.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Content types */}
              <div>
                <h4 className="font-semibold text-sm mb-2">Tipos de conteúdo</h4>
                <div className="space-y-1.5">
                  {CONTENT_TYPES.map(({ value, label, icon }) => (
                    <div key={value} className="flex items-center gap-2">
                      <Checkbox
                        id={`filter-${value}`}
                        checked={filters.types?.includes(value) ?? false}
                        onCheckedChange={(checked) => {
                          const currentTypes = filters.types || [];
                          const newTypes = checked
                            ? [...currentTypes, value]
                            : currentTypes.filter(t => t !== value);
                          updateFilters({ types: newTypes.length ? newTypes : undefined });
                        }}
                      />
                      <Label htmlFor={`filter-${value}`} className="text-sm cursor-pointer">
                        {icon} {label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Date filters */}
              <div>
                <h4 className="font-semibold text-sm mb-2">Período</h4>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">De</Label>
                    <Input
                      type="date"
                      className="h-8 text-xs"
                      value={filters.dateFrom ? filters.dateFrom.toISOString().split('T')[0] : ''}
                      onChange={(e) => updateFilters({
                        dateFrom: e.target.value ? new Date(e.target.value) : undefined,
                      })}
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Até</Label>
                    <Input
                      type="date"
                      className="h-8 text-xs"
                      value={filters.dateTo ? filters.dateTo.toISOString().split('T')[0] : ''}
                      onChange={(e) => updateFilters({
                        dateTo: e.target.value ? new Date(e.target.value) : undefined,
                      })}
                    />
                  </div>
                </div>
              </div>

              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                  onClick={resetFilters}
                >
                  Limpar filtros
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active filters display */}
      {activeFilterCount > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {filters.types?.map(type => (
            <Badge key={type} variant="secondary" className="text-xs gap-1">
              {getTypeIcon(type)} {getTypeLabel(type)}
              <button onClick={() => {
                const newTypes = filters.types?.filter(t => t !== type);
                updateFilters({ types: newTypes?.length ? newTypes : undefined });
              }}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {filters.dateFrom && (
            <Badge variant="secondary" className="text-xs gap-1">
              De: {filters.dateFrom.toLocaleDateString('pt-BR')}
              <button onClick={() => updateFilters({ dateFrom: undefined })}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.dateTo && (
            <Badge variant="secondary" className="text-xs gap-1">
              Até: {filters.dateTo.toLocaleDateString('pt-BR')}
              <button onClick={() => updateFilters({ dateTo: undefined })}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      {/* Loading state */}
      {isSearching && (
        <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span className="text-sm">Buscando...</span>
        </div>
      )}

      {/* Results */}
      {!isSearching && results.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {totalResults} resultado{totalResults !== 1 ? 's' : ''} encontrado{totalResults !== 1 ? 's' : ''}
            </span>
            <span className="text-xs text-muted-foreground capitalize">
              Modo: {searchMode === 'local' ? 'Local' : searchMode === 'semantic' ? 'Semântica' : 'Texto'}
            </span>
          </div>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-2 pr-2">
              {results.map((result) => (
                <ResultCard
                  key={result.id}
                  result={result}
                  query={query}
                  searchMode={searchMode}
                />
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Empty state */}
      {!isSearching && query.length >= 2 && results.length === 0 && (
        <div className="text-center py-8">
          <Search className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground text-sm">Nenhum resultado encontrado</p>
          <p className="text-xs text-muted-foreground mt-1">
            Tente termos diferentes ou ajuste os filtros
          </p>
        </div>
      )}
    </div>
  );
}
