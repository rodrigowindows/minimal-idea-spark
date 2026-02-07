import type { Opportunity, DailyLog, CalendarEvent, KnowledgeBase } from '@/types/database';
import type { Goal, Habit } from '@/hooks/useLocalData';

export interface IndexedItem {
  id: string;
  type: 'opportunity' | 'journal' | 'calendar' | 'knowledge' | 'goal' | 'habit';
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  metadata: Record<string, any>;
}

const SEARCH_INDEX_KEY = 'lifeos_search_index';

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 1);
}

function computeRelevance(tokens: string[], queryTokens: string[]): number {
  if (queryTokens.length === 0) return 0;
  let matched = 0;
  for (const qt of queryTokens) {
    if (tokens.some(t => t.includes(qt))) matched++;
  }
  return matched / queryTokens.length;
}

export function indexOpportunities(opportunities: Opportunity[]): IndexedItem[] {
  return opportunities.map(opp => ({
    id: opp.id,
    type: 'opportunity',
    title: opp.title,
    content: [opp.title, opp.description || '', opp.type, opp.status, opp.domain?.name || ''].join(' '),
    tags: [opp.type, opp.status, opp.domain?.name || ''].filter(Boolean),
    created_at: opp.created_at,
    metadata: {
      status: opp.status,
      priority: opp.priority,
      strategic_value: opp.strategic_value,
      domain: opp.domain?.name,
      domain_color: opp.domain?.color_theme,
      opp_type: opp.type,
    },
  }));
}

export function indexDailyLogs(logs: DailyLog[]): IndexedItem[] {
  return logs.map(log => ({
    id: log.id,
    type: 'journal',
    title: `Journal - ${log.log_date}`,
    content: [log.content, log.mood || ''].join(' '),
    tags: [log.mood || ''].filter(Boolean),
    created_at: log.created_at,
    metadata: {
      mood: log.mood,
      energy_level: log.energy_level,
      log_date: log.log_date,
    },
  }));
}

export function indexCalendarEvents(events: CalendarEvent[]): IndexedItem[] {
  return events.map(event => ({
    id: event.id,
    type: 'calendar',
    title: event.title,
    content: [event.title, event.description || '', event.category].join(' '),
    tags: [event.category].filter(Boolean),
    created_at: event.created_at,
    metadata: {
      category: event.category,
      start: event.start,
      end: event.end,
      color: event.color,
    },
  }));
}

export function indexGoals(goals: Goal[]): IndexedItem[] {
  return goals.map(goal => ({
    id: goal.id,
    type: 'goal',
    title: goal.title,
    content: [goal.title, goal.description, ...goal.milestones.map(m => m.title)].join(' '),
    tags: [],
    created_at: goal.created_at,
    metadata: {
      progress: goal.progress,
      target_date: goal.target_date,
      milestones_count: goal.milestones.length,
      milestones_done: goal.milestones.filter(m => m.done).length,
    },
  }));
}

export function indexHabits(habits: Habit[]): IndexedItem[] {
  return habits.map(habit => ({
    id: habit.id,
    type: 'habit',
    title: habit.name,
    content: [habit.name, habit.frequency].join(' '),
    tags: [habit.frequency],
    created_at: habit.created_at,
    metadata: {
      frequency: habit.frequency,
      target_count: habit.target_count,
      completions_count: habit.completions.length,
      color: habit.color,
    },
  }));
}

export function buildSearchIndex(data: {
  opportunities?: Opportunity[];
  dailyLogs?: DailyLog[];
  calendarEvents?: CalendarEvent[];
  goals?: Goal[];
  habits?: Habit[];
}): IndexedItem[] {
  const items: IndexedItem[] = [];

  if (data.opportunities) items.push(...indexOpportunities(data.opportunities));
  if (data.dailyLogs) items.push(...indexDailyLogs(data.dailyLogs));
  if (data.calendarEvents) items.push(...indexCalendarEvents(data.calendarEvents));
  if (data.goals) items.push(...indexGoals(data.goals));
  if (data.habits) items.push(...indexHabits(data.habits));

  return items;
}

export function saveSearchIndex(items: IndexedItem[]) {
  try {
    localStorage.setItem(SEARCH_INDEX_KEY, JSON.stringify(items));
  } catch {
    // Storage quota exceeded, silently ignore
  }
}

export function loadSearchIndex(): IndexedItem[] {
  try {
    const stored = localStorage.getItem(SEARCH_INDEX_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return [];
}

export interface LocalSearchFilters {
  types?: string[];
  dateFrom?: string;
  dateTo?: string;
  tags?: string[];
}

export function localSearch(
  items: IndexedItem[],
  query: string,
  filters?: LocalSearchFilters
): (IndexedItem & { relevance: number })[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  let filtered = items;

  if (filters?.types && filters.types.length > 0) {
    filtered = filtered.filter(item => filters.types!.includes(item.type));
  }

  if (filters?.dateFrom) {
    filtered = filtered.filter(item => item.created_at >= filters.dateFrom!);
  }

  if (filters?.dateTo) {
    filtered = filtered.filter(item => item.created_at <= filters.dateTo!);
  }

  if (filters?.tags && filters.tags.length > 0) {
    filtered = filtered.filter(item =>
      filters.tags!.some(tag => item.tags.includes(tag.toLowerCase()))
    );
  }

  const results = filtered
    .map(item => {
      const contentTokens = tokenize(item.content);
      const titleTokens = tokenize(item.title);
      const contentRelevance = computeRelevance(contentTokens, queryTokens);
      const titleRelevance = computeRelevance(titleTokens, queryTokens);
      // Title matches weight more
      const relevance = titleRelevance * 0.6 + contentRelevance * 0.4;
      return { ...item, relevance };
    })
    .filter(item => item.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance);

  return results;
}

export function getSuggestions(items: IndexedItem[], partialQuery: string, limit = 5): string[] {
  if (partialQuery.length < 2) return [];

  const lower = partialQuery.toLowerCase();
  const seen = new Set<string>();
  const suggestions: string[] = [];

  for (const item of items) {
    if (suggestions.length >= limit) break;
    const title = item.title.toLowerCase();
    if (title.includes(lower) && !seen.has(item.title)) {
      seen.add(item.title);
      suggestions.push(item.title);
    }
  }

  return suggestions;
}
