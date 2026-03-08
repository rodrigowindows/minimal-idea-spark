import { useState, useCallback, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import type { LifeDomain } from '@/types'

const defaultDomainDefs = [
  { name: 'Career', color_theme: '#4f46e5', target_percentage: 30 },
  { name: 'Health', color_theme: '#10b981', target_percentage: 25 },
  { name: 'Finance', color_theme: '#f59e0b', target_percentage: 20 },
  { name: 'Learning', color_theme: '#8b5cf6', target_percentage: 25 },
  { name: 'Family', color_theme: '#ec4899', target_percentage: 0 },
]

export function useDomains() {
  const { user } = useAuth()
  const userId = user?.id
  const loadedForUser = useRef<string | null>(null)

  const [domains, setDomains] = useState<LifeDomain[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setDomains([])
      setIsLoading(false)
      loadedForUser.current = null
      return
    }
    if (loadedForUser.current === userId) return
    loadedForUser.current = userId

    setIsLoading(true)
    async function load() {
      try {
        const { data, error } = await supabase
          .from('life_domains')
          .select('*')
          .order('created_at', { ascending: true })

        if (!error && data && data.length > 0) {
          setDomains(data.map(d => ({
            id: d.id,
            user_id: d.user_id,
            name: d.name,
            color_theme: d.color_theme,
            target_percentage: d.target_percentage ?? 0,
            created_at: d.created_at,
          })))
        } else if (!error && (!data || data.length === 0)) {
          // Seed default domains for new user
          const defaults = defaultDomainDefs.map(d => ({
            user_id: userId!,
            name: d.name,
            color_theme: d.color_theme,
            target_percentage: d.target_percentage,
          }))
          const { data: inserted, error: insertErr } = await supabase
            .from('life_domains')
            .insert(defaults)
            .select()
          if (!insertErr && inserted) {
            setDomains(inserted.map(d => ({
              id: d.id,
              user_id: d.user_id,
              name: d.name,
              color_theme: d.color_theme,
              target_percentage: d.target_percentage ?? 0,
              created_at: d.created_at,
            })))
          }
        }
      } catch { /* ignore */ }
      setIsLoading(false)
    }
    load()
  }, [userId])

  const addDomain = useCallback((name: string, color: string, targetPercentage?: number) => {
    if (!userId) return null as unknown as LifeDomain
    const tempId = crypto.randomUUID()
    const newDomain: LifeDomain = {
      id: tempId,
      user_id: userId,
      name,
      color_theme: color,
      target_percentage: targetPercentage,
      created_at: new Date().toISOString(),
    }
    setDomains(prev => [...prev, newDomain])

    supabase.from('life_domains').insert({
      id: tempId,
      user_id: userId,
      name,
      color_theme: color,
      target_percentage: targetPercentage ?? 0,
    }).then(({ error }) => { if (error) console.error('[addDomain]', error) })

    return newDomain
  }, [userId])

  return { domains, isLoading: isLoading, addDomain }
}
