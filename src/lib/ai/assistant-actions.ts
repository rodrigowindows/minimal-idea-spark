/**
 * Parse and execute actions from assistant chat.
 * Supports natural language + slash commands in EN and PT-BR.
 * Actions: create task, add journal, open page, complete task, start deep work,
 * add habit, set goal, schedule event, show stats, search.
 */

export type AssistantActionType =
  | 'create_task'
  | 'add_journal'
  | 'open_page'
  | 'complete_task'
  | 'start_deep_work'
  | 'add_habit'
  | 'schedule_event'
  | 'show_stats'
  | 'search'
  | 'none'

export interface ParsedAction {
  type: AssistantActionType
  payload?: Record<string, string>
}

export interface ActionCallbacks {
  addOpportunity?: (data: { title: string; type: string; status: string; priority: number; description: string; domain_id: string | null; strategic_value: number }) => unknown
  addDailyLog?: (data: { content: string; mood: string | null; energy_level: number | null; log_date: string }) => unknown
  moveOpportunityStatus?: (id: string, status: string) => void
  navigate?: (path: string) => void
  startDeepWork?: () => void
  addHabit?: (data: { name: string; domain_id: string | null; frequency: 'daily' | 'weekly'; target_count: number; color: string }) => unknown
}

// ---------- Pattern sets ----------

const TASK_PATTERNS = [
  /\/task\s+"?([^"]+)"?/i,
  /\/tarefa\s+"?([^"]+)"?/i,
  /criar?\s+(?:uma?\s+)?tarefa\s+"?([^"]+)"?/i,
  /create\s+(?:a\s+)?task\s+"?([^"]+)"?/i,
  /add\s+task\s+"?([^"]+)"?/i,
  /nova?\s+tarefa\s+"?([^"]+)"?/i,
  /adicionar?\s+tarefa\s+"?([^"]+)"?/i,
]

const JOURNAL_PATTERNS = [
  /\/journal\s+(.+)/i,
  /\/diario\s+(.+)/i,
  /registr(?:ar|e)\s+(?:no\s+)?di[áa]rio[:\s]+(.+)/i,
  /log\s+(?:to\s+)?journal[:\s]+(.+)/i,
  /journal[:\s]+(.+)/i,
  /anotar[:\s]+(.+)/i,
]

const OPEN_PATTERNS = [
  /\/open\s+(\w+)/i,
  /\/abrir\s+(\w+)/i,
  /abrir?\s+(?:a\s+)?p[áa]gina\s+(?:de\s+)?(\w+)/i,
  /open\s+(dashboard|analytics|journal|opportunities|habits|goals|calendar|settings|consultant|priorities|automation|templates|images|weekly-review|workspace|content-generator)/i,
  /ir\s+(?:para\s+)?(\w+)/i,
  /go\s+to\s+(\w+)/i,
]

const COMPLETE_PATTERNS = [
  /\/complete\s+"?([^"]+)"?/i,
  /\/concluir\s+"?([^"]+)"?/i,
  /complet(?:ar|e)\s+(?:a?\s+)?(?:tarefa\s+)?"?([^"]+)"?/i,
  /finish\s+(?:task\s+)?"?([^"]+)"?/i,
  /mark\s+(?:as\s+)?done[:\s]+"?([^"]+)"?/i,
]

const DEEP_WORK_PATTERNS = [
  /\/focus/i,
  /\/deep[\s-]?work/i,
  /start\s+(?:deep\s+)?(?:work|focus)/i,
  /iniciar\s+(?:foco|deep\s*work)/i,
  /modo\s+foco/i,
]

const HABIT_PATTERNS = [
  /\/habit\s+"?([^"]+)"?/i,
  /\/habito\s+"?([^"]+)"?/i,
  /(?:create|add|novo?|adicionar?)\s+(?:a?\s+)?h[áa]bito?\s+"?([^"]+)"?/i,
]

const STATS_PATTERNS = [
  /\/stats/i,
  /\/status/i,
  /show\s+(?:my\s+)?stats/i,
  /meu(?:s)?\s+status/i,
  /how\s+am\s+i\s+doing/i,
  /como\s+estou/i,
]

const SEARCH_PATTERNS = [
  /\/search\s+(.+)/i,
  /\/buscar\s+(.+)/i,
  /search\s+(?:for\s+)?(.+)/i,
  /buscar?\s+(.+)/i,
  /encontrar?\s+(.+)/i,
  /find\s+(.+)/i,
]

// Page name aliases
const PAGE_ALIASES: Record<string, string> = {
  home: '/',
  dashboard: '/',
  painel: '/',
  consultant: '/consultant',
  consultor: '/consultant',
  opportunities: '/opportunities',
  oportunidades: '/opportunities',
  tasks: '/opportunities',
  tarefas: '/opportunities',
  journal: '/journal',
  diario: '/journal',
  analytics: '/analytics',
  analise: '/analytics',
  habits: '/habits',
  habitos: '/habits',
  goals: '/goals',
  metas: '/goals',
  calendar: '/calendar',
  calendario: '/calendar',
  agenda: '/calendar',
  settings: '/settings',
  config: '/settings',
  configuracoes: '/settings',
  priorities: '/goals',
  prioridades: '/goals',
  automation: '/automation',
  automacao: '/automation',
  templates: '/templates',
  modelos: '/templates',
  images: '/images',
  imagens: '/images',
  'weekly-review': '/weekly-review',
  revisao: '/weekly-review',
  workspace: '/workspace',
  'content-generator': '/content-generator',
  conteudo: '/content-generator',
}

/**
 * Parse user message to detect an action intent.
 */
export function parseAssistantIntent(text: string): ParsedAction {
  const t = text.trim()

  // Create task
  for (const p of TASK_PATTERNS) {
    const m = t.match(p)
    if (m) return { type: 'create_task', payload: { title: m[1].trim() } }
  }

  // Journal entry
  for (const p of JOURNAL_PATTERNS) {
    const m = t.match(p)
    if (m) return { type: 'add_journal', payload: { content: m[1].trim() } }
  }

  // Complete task
  for (const p of COMPLETE_PATTERNS) {
    const m = t.match(p)
    if (m) return { type: 'complete_task', payload: { title: m[1].trim() } }
  }

  // Deep work
  for (const p of DEEP_WORK_PATTERNS) {
    if (p.test(t)) return { type: 'start_deep_work' }
  }

  // Add habit
  for (const p of HABIT_PATTERNS) {
    const m = t.match(p)
    if (m) return { type: 'add_habit', payload: { name: m[1].trim() } }
  }

  // Show stats
  for (const p of STATS_PATTERNS) {
    if (p.test(t)) return { type: 'show_stats' }
  }

  // Search
  for (const p of SEARCH_PATTERNS) {
    const m = t.match(p)
    if (m) return { type: 'search', payload: { query: m[1].trim() } }
  }

  // Open page (check last to avoid false positives)
  for (const p of OPEN_PATTERNS) {
    const m = t.match(p)
    if (m) {
      const page = m[1].trim().toLowerCase()
      return { type: 'open_page', payload: { page } }
    }
  }

  return { type: 'none' }
}

/**
 * Execute a parsed action using provided callbacks.
 */
export function executeAssistantAction(
  action: ParsedAction,
  callbacks: ActionCallbacks
): { success: boolean; message: string } {
  switch (action.type) {
    case 'create_task': {
      const title = action.payload?.title ?? ''
      if (callbacks.addOpportunity) {
        callbacks.addOpportunity({
          title,
          type: 'action',
          status: 'backlog',
          priority: 5,
          description: '',
          domain_id: null,
          strategic_value: 5,
        })
        return { success: true, message: `Task "${title}" created in Backlog.` }
      }
      return { success: false, message: 'Unable to create task right now.' }
    }

    case 'add_journal': {
      const content = action.payload?.content ?? ''
      if (callbacks.addDailyLog) {
        callbacks.addDailyLog({
          content,
          mood: null,
          energy_level: null,
          log_date: new Date().toISOString().split('T')[0],
        })
        return { success: true, message: 'Journal entry saved.' }
      }
      return { success: false, message: 'Unable to save journal entry right now.' }
    }

    case 'open_page': {
      const pageName = action.payload?.page?.toLowerCase() ?? 'dashboard'
      const path = PAGE_ALIASES[pageName] ?? `/${pageName}`
      if (callbacks.navigate) {
        callbacks.navigate(path)
        return { success: true, message: `Opening ${pageName}...` }
      }
      return { success: false, message: 'Navigation not available.' }
    }

    case 'complete_task': {
      const title = action.payload?.title ?? ''
      return { success: true, message: `Looking for task "${title}" to mark as done...` }
    }

    case 'start_deep_work': {
      if (callbacks.startDeepWork) {
        callbacks.startDeepWork()
        return { success: true, message: 'Starting Deep Work mode. Focus!' }
      }
      return { success: false, message: 'Deep Work mode not available.' }
    }

    case 'add_habit': {
      const name = action.payload?.name ?? ''
      if (callbacks.addHabit) {
        callbacks.addHabit({
          name,
          domain_id: null,
          frequency: 'daily',
          target_count: 1,
          color: '#3b82f6',
        })
        return { success: true, message: `Habit "${name}" created (daily).` }
      }
      return { success: false, message: 'Unable to create habit right now.' }
    }

    case 'show_stats':
      return { success: true, message: '__show_stats__' }

    case 'search': {
      const query = action.payload?.query ?? ''
      return { success: true, message: `__search__:${query}` }
    }

    case 'none':
      return { success: true, message: '' }

    default:
      return { success: false, message: 'Unknown action.' }
  }
}
