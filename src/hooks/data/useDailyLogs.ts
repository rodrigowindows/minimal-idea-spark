import { useState, useCallback, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import type { DailyLog } from '@/types'

export function useDailyLogs() {
  const { user } = useAuth()
  const userId = user?.id ?? 'local'
  const initialLoadDone = useRef(false)

  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user || initialLoadDone.current) return
    initialLoadDone.current = true

    async function load() {
      try {
        const { data, error } = await supabase
          .from('daily_logs')
          .select('*')
          .order('log_date', { ascending: false })
        if (!error && data) setDailyLogs(data as unknown as DailyLog[])
      } catch { /* ignore */ }
      setIsLoading(false)
    }
    load()
  }, [user])

  const addDailyLog = useCallback((data: Omit<DailyLog, 'id' | 'user_id' | 'created_at'>) => {
    const tempId = crypto.randomUUID()
    const newLog: DailyLog = { ...data, id: tempId, user_id: userId, created_at: new Date().toISOString() }
    setDailyLogs(prev => [newLog, ...prev])

    supabase.from('daily_logs').insert({
      id: tempId, user_id: userId,
      content: data.content, mood: data.mood ?? null,
      energy_level: data.energy_level ?? 5, log_date: data.log_date,
    }).then(({ error }) => { if (error) console.error('[addDailyLog]', error) })

    return newLog
  }, [userId])

  const deleteDailyLog = useCallback((id: string) => {
    setDailyLogs(prev => prev.filter(log => log.id !== id))
    supabase.from('daily_logs').delete().eq('id', id).then(({ error }) => {
      if (error) console.error('[deleteDailyLog]', error)
    })
  }, [])

  return { dailyLogs, isLoading: isLoading, addDailyLog, deleteDailyLog }
}
