const KEY = 'lifeos_ai_usage'
const PREFS_KEY = 'lifeos_ai_preferences'
const RATE_LIMIT_KEY = 'lifeos_ai_rate_limit'

interface UsageMonth {
  month: string // YYYY-MM
  count: number
}

export interface AIPreferences {
  enableConsultant: boolean
  enableContentGenerator: boolean
  enableInsights: boolean
  enableImageGeneration: boolean
  enableAutomationSuggestions: boolean
  enableAssistant: boolean
}

const DEFAULT_PREFERENCES: AIPreferences = {
  enableConsultant: true,
  enableContentGenerator: true,
  enableInsights: true,
  enableImageGeneration: true,
  enableAutomationSuggestions: true,
  enableAssistant: true,
}

interface RateLimitState {
  retryAfter: number | null // timestamp ms
  lastError: string | null
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

function loadUsage(): UsageMonth[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return []
}

function saveUsage(usage: UsageMonth[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(usage.slice(-12)))
  } catch { /* ignore */ }
}

export function recordAIUsage(): void {
  const month = currentMonth()
  const usage = loadUsage()
  const existing = usage.find((u) => u.month === month)
  if (existing) {
    existing.count += 1
  } else {
    usage.push({ month, count: 1 })
  }
  saveUsage(usage)
}

export function getCurrentMonthCount(): number {
  const month = currentMonth()
  const usage = loadUsage()
  return usage.find((u) => u.month === month)?.count ?? 0
}

export function getUsageByMonth(): UsageMonth[] {
  return loadUsage()
}

// --- AI Preferences ---

export function getAIPreferences(): AIPreferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (raw) return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return { ...DEFAULT_PREFERENCES }
}

export function setAIPreferences(prefs: Partial<AIPreferences>): void {
  try {
    const current = getAIPreferences()
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...current, ...prefs }))
  } catch { /* ignore */ }
}

export function isAIFeatureEnabled(feature: keyof AIPreferences): boolean {
  return getAIPreferences()[feature]
}

// --- Rate Limit ---

export function setRateLimited(retryAfterSeconds?: number): void {
  const state: RateLimitState = {
    retryAfter: retryAfterSeconds
      ? Date.now() + retryAfterSeconds * 1000
      : Date.now() + 60_000,
    lastError: 'rate_limited',
  }
  try {
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(state))
  } catch { /* ignore */ }
}

export function clearRateLimit(): void {
  try {
    localStorage.removeItem(RATE_LIMIT_KEY)
  } catch { /* ignore */ }
}

export function isRateLimited(): boolean {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY)
    if (!raw) return false
    const state: RateLimitState = JSON.parse(raw)
    if (state.retryAfter && Date.now() < state.retryAfter) return true
    localStorage.removeItem(RATE_LIMIT_KEY)
  } catch { /* ignore */ }
  return false
}

export function getRateLimitRetryIn(): number {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY)
    if (!raw) return 0
    const state: RateLimitState = JSON.parse(raw)
    if (state.retryAfter && Date.now() < state.retryAfter) {
      return Math.ceil((state.retryAfter - Date.now()) / 1000)
    }
  } catch { /* ignore */ }
  return 0
}

// --- Friendly error messages ---

export function getFriendlyAIError(error: unknown): string {
  if (error instanceof Response || (error instanceof Error && error.message.includes('429'))) {
    return 'Muitas requisições. Tente novamente em alguns minutos.'
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('not authenticated') || msg.includes('401')) {
      return 'Sessão expirada. Faça login novamente.'
    }
    if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')) {
      return 'Sem conexão com o servidor. Verifique sua internet.'
    }
    if (msg.includes('timeout') || msg.includes('aborted')) {
      return 'A requisição demorou muito. Tente novamente.'
    }
    if (msg.includes('500') || msg.includes('internal server')) {
      return 'Erro interno do servidor. Tente novamente mais tarde.'
    }
    if (msg.includes('403') || msg.includes('forbidden')) {
      return 'Acesso negado. Verifique suas permissões.'
    }
  }
  return 'Algo deu errado com a AI. Tente novamente.'
}
