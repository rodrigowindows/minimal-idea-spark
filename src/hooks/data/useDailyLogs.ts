import { useState, useCallback, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import type { DailyLog } from '@/types'

export function useDailyLogs() {
  const { user } = useAuth()
  const userId = user?.id
  const loadedForUser = useRef<string | null>(null)

  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setDailyLogs([])
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
          .from('daily_logs')
          .select('*')
          .order('log_date', { ascending: false })
        if (!error && data) setDailyLogs(data as unknown as DailyLog[])
      } catch { /* ignore */ }
      setIsLoading(false)
    }
    load()
  }, [userId])

  // Realtime subscription for cross-device sync
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel('daily-logs-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_logs' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const row = payload.new as any
          if (row.user_id !== userId) return
          setDailyLogs(prev => {
            if (prev.some(x => x.id === row.id)) return prev
            return [row as DailyLog, ...prev]
          })
        } else if (payload.eventType === 'UPDATE') {
          const row = payload.new as any
          setDailyLogs(prev => prev.map(x => x.id === row.id ? { ...x, ...row } as DailyLog : x))
        } else if (payload.eventType === 'DELETE') {
          const old = payload.old as any
          setDailyLogs(prev => prev.filter(x => x.id !== old.id))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  const addDailyLog = useCallback((data: Omit<DailyLog, 'id' | 'user_id' | 'created_at'>) => {
    if (!userId) return null as unknown as DailyLog
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

  const updateDailyLog = useCallback((id: string, data: Partial<DailyLog>) => {
    setDailyLogs(prev => prev.map(log => log.id === id ? { ...log, ...data } : log))
    const { id: _id, user_id: _uid, created_at: _ca, ...dbData } = data as any
    supabase.from('daily_logs').update(dbData).eq('id', id).then(({ error }) => {
      if (error) console.error('[updateDailyLog]', error)
    })
  }, [])

  const deleteDailyLog = useCallback((id: string) => {
    setDailyLogs(prev => prev.filter(log => log.id !== id))
    supabase.from('daily_logs').delete().eq('id', id).then(({ error }) => {
      if (error) console.error('[deleteDailyLog]', error)
    })
  }, [])

  return { dailyLogs, isLoading, addDailyLog, updateDailyLog, deleteDailyLog }
}
