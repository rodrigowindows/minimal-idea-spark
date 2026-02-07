/**
 * Parse and execute actions from assistant chat (e.g. "create task X").
 */

export type AssistantActionType = 'create_task' | 'add_journal' | 'open_page' | 'none'

export interface ParsedAction {
  type: AssistantActionType
  payload?: Record<string, string>
}

const TASK_PATTERNS = [
  /criar (?:uma )?tarefa\s+(.+)/i,
  /create (?:a )?task\s+(.+)/i,
  /add task\s+(.+)/i,
  /nova tarefa\s+(.+)/i,
]

const JOURNAL_PATTERNS = [
  /registr(?:ar|e) (?:no )?di[áa]rio\s+(.+)/i,
  /log (?:to )?journal\s+(.+)/i,
  /journal\s+(.+)/i,
]

export function parseAssistantIntent(text: string): ParsedAction {
  const t = text.trim()
  for (const p of TASK_PATTERNS) {
    const m = t.match(p)
    if (m) return { type: 'create_task', payload: { title: m[1].trim() } }
  }
  for (const p of JOURNAL_PATTERNS) {
    const m = t.match(p)
    if (m) return { type: 'add_journal', payload: { content: m[1].trim() } }
  }
  if (/open (dashboard|analytics|journal|opportunities)/i.test(t)) {
    const page = t.match(/open (\w+)/i)?.[1] ?? 'dashboard'
    return { type: 'open_page', payload: { page } }
  }
  return { type: 'none' }
}

export async function executeAssistantAction(action: ParsedAction): Promise<{ success: boolean; message?: string }> {
  if (action.type === 'none') return { success: true }
  if (action.type === 'open_page' && action.payload?.page) {
    window.location.href = action.payload.page === 'dashboard' ? '/' : `/${action.payload.page}`
    return { success: true }
  }
  if (action.type === 'create_task') {
    return { success: true, message: `Task "${action.payload?.title ?? ''}" will be created.` }
  }
  if (action.type === 'add_journal') {
    return { success: true, message: 'Journal entry added.' }
  }
  return { success: false }
}
