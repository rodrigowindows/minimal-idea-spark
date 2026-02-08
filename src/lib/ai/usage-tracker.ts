const KEY = 'lifeos_ai_usage'
const MONTH_KEY = 'lifeos_ai_usage_month'

interface UsageMonth {
  month: string // YYYY-MM
  count: number
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
