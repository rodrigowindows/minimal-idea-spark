import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import type { LifeDomain } from '@/types'
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from './storage'

const defaultDomains: LifeDomain[] = [
  { id: 'domain-career', user_id: 'local', name: 'Career', color_theme: '#4f46e5', target_percentage: 30, created_at: '2025-01-01T00:00:00Z' },
  { id: 'domain-health', user_id: 'local', name: 'Health', color_theme: '#10b981', target_percentage: 25, created_at: '2025-01-01T00:00:00Z' },
  { id: 'domain-finance', user_id: 'local', name: 'Finance', color_theme: '#f59e0b', target_percentage: 20, created_at: '2025-01-01T00:00:00Z' },
  { id: 'domain-learning', user_id: 'local', name: 'Learning', color_theme: '#8b5cf6', target_percentage: 25, created_at: '2025-01-01T00:00:00Z' },
  { id: 'domain-family', user_id: 'local', name: 'Family', color_theme: '#ec4899', target_percentage: 0, created_at: '2025-01-01T00:00:00Z' },
]

export function useDomains() {
  const { user } = useAuth()
  const userId = user?.id ?? 'local'

  const [domains, setDomains] = useState<LifeDomain[]>(() =>
    loadFromStorage(STORAGE_KEYS.domains, defaultDomains)
  )

  useEffect(() => { saveToStorage(STORAGE_KEYS.domains, domains) }, [domains])

  const addDomain = useCallback((name: string, color: string, targetPercentage?: number) => {
    const newDomain: LifeDomain = {
      id: `domain-${Date.now()}`,
      user_id: userId,
      name,
      color_theme: color,
      target_percentage: targetPercentage,
      created_at: new Date().toISOString(),
    }
    setDomains(prev => [...prev, newDomain])
    return newDomain
  }, [userId])

  return { domains, addDomain }
}
