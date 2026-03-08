/**
 * Centralized localStorage wrapper with type safety.
 */

export const STORAGE_KEYS = {
  OPPORTUNITIES: 'opportunities',
  GOALS: 'goals',
  HABITS: 'habits',
  DOMAINS: 'domains',
  THEME: 'theme',
  LANGUAGE: 'language',
  SIDEBAR_COLLAPSED: 'sidebar-collapsed',
  
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS] | string

export function getStorageItem<T>(key: StorageKey, fallback: T): T {
  try {
    const item = localStorage.getItem(key)
    return item ? (JSON.parse(item) as T) : fallback
  } catch {
    return fallback
  }
}

export function setStorageItem<T>(key: StorageKey, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`Failed to save ${key}:`, error)
  }
}

export function getStorageValue(key: StorageKey, fallback = ''): string {
  try {
    const item = localStorage.getItem(key)
    return item ?? fallback
  } catch {
    return fallback
  }
}

export function setStorageValue(key: StorageKey, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch (error) {
    console.error(`Failed to save ${key}:`, error)
  }
}

export function removeStorageItem(key: StorageKey): void {
  localStorage.removeItem(key)
}

export function clearStorage(): void {
  localStorage.clear()
}
