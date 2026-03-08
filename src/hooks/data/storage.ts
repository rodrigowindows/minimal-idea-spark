/**
 * localStorage helpers shared across data hooks.
 */
export function loadFromStorage<T>(key: string, defaults: T): T {
  try {
    const stored = localStorage.getItem(key)
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  return defaults
}

export function saveToStorage<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data))
}

export const STORAGE_KEYS = {
  domains: 'lifeos_domains',
  habits: 'lifeos_habits',
  goals: 'lifeos_goals',
  weeklyTargets: 'lifeos_weekly_targets',
} as const
