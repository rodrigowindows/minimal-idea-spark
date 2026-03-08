import { useState, useCallback, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import type { Opportunity, LifeDomain } from '@/types'

export function useOpportunities(domains: LifeDomain[]) {
  const { user } = useAuth()
  const userId = user?.id
  const loadedForUser = useRef<string | null>(null)

  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setOpportunities([])
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
          .from('opportunities')
          .select('*')
          .order('created_at', { ascending: false })
        if (!error && data) setOpportunities(data as unknown as Opportunity[])
      } catch { /* ignore */ }
      setIsLoading(false)
    }
    load()
  }, [userId])

  const enrichedOpportunities = opportunities.map(opp => ({
    ...opp,
    domain: domains.find(d => d.id === opp.domain_id),
  }))

  const addOpportunity = useCallback((data: Omit<Opportunity, 'id' | 'user_id' | 'created_at' | 'domain'>) => {
    if (!userId) return null as unknown as Opportunity
    const tempId = crypto.randomUUID()
    const newOpp: Opportunity = { ...data, id: tempId, user_id: userId, created_at: new Date().toISOString() }
    setOpportunities(prev => [newOpp, ...prev])

    supabase.from('opportunities').insert({
      id: tempId, user_id: userId, domain_id: data.domain_id ?? null,
      title: data.title, description: data.description ?? null,
      type: data.type, status: data.status, priority: data.priority,
      strategic_value: data.strategic_value ?? null,
      due_date: data.due_date ?? null, reminder_at: data.reminder_at ?? null,
      goal_id: data.goal_id ?? null, xp_reward: data.xp_reward ?? null,
    }).then(({ error }) => { if (error) console.error('[addOpportunity]', error) })

    return newOpp
  }, [userId])

  const updateOpportunity = useCallback((id: string, data: Partial<Opportunity>) => {
    setOpportunities(prev => prev.map(opp => opp.id === id ? { ...opp, ...data } : opp))
    const { domain, ...dbData } = data as any
    supabase.from('opportunities').update(dbData).eq('id', id).then(({ error }) => {
      if (error) console.error('[updateOpportunity]', error)
    })
  }, [])

  const deleteOpportunity = useCallback((id: string) => {
    setOpportunities(prev => prev.filter(opp => opp.id !== id))
    supabase.from('opportunities').delete().eq('id', id).then(({ error }) => {
      if (error) console.error('[deleteOpportunity]', error)
    })
  }, [])

  const moveOpportunityStatus = useCallback((id: string, status: Opportunity['status']) => {
    setOpportunities(prev => prev.map(opp => opp.id === id ? { ...opp, status } : opp))
    supabase.from('opportunities').update({ status }).eq('id', id).then(({ error }) => {
      if (error) console.error('[moveOpportunityStatus]', error)
    })
  }, [])

  return {
    opportunities: enrichedOpportunities,
    rawOpportunities: opportunities,
    isLoading,
    addOpportunity,
    updateOpportunity,
    deleteOpportunity,
    moveOpportunityStatus,
  }
}
