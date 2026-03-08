import { useState, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

interface Classification {
  type: 'action' | 'idea' | 'resource' | 'connection' | 'event'
  priority: number
  status: 'backlog' | 'doing' | 'blocked'
  reasoning: string
}

export function useAICategorize() {
  const [loading, setLoading] = useState(false)

  const categorize = useCallback(async (title: string, description?: string): Promise<Classification | null> => {
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('assistant-chat', {
        body: {
          mode: 'categorize',
          messages: [],
          data: { title, description },
        },
      })

      if (error) throw error
      return data?.classification ?? null
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to categorize'
      if (msg.includes('RATE_LIMITED')) {
        toast.error('AI rate limited. Try again in a moment.')
      } else if (msg.includes('PAYMENT_REQUIRED')) {
        toast.error('AI credits exhausted. Please add credits.')
      }
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { categorize, loading }
}

interface JournalCoachMessage {
  role: 'user' | 'assistant'
  content: string
}

export function useAIJournalCoach() {
  const [loading, setLoading] = useState(false)

  const getCoachResponse = useCallback(async (
    messages: JournalCoachMessage[],
    recentEntries?: Array<{ date: string; mood?: string; energy?: number; content: string }>
  ): Promise<string | null> => {
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('assistant-chat', {
        body: {
          mode: 'journal-coach',
          messages,
          data: { recentEntries },
        },
      })

      if (error) throw error
      return data?.reply ?? null
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to get coach response'
      if (msg.includes('RATE_LIMITED')) {
        toast.error('AI rate limited. Try again in a moment.')
      }
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { getCoachResponse, loading }
}

export function useAIWeeklyInsights() {
  const [loading, setLoading] = useState(false)
  const [insights, setInsights] = useState<string | null>(null)

  const generateInsights = useCallback(async (metrics: {
    tasks_completed: number
    tasks_doing: number
    deep_work_minutes: number
    streak_days: number
    xp_gained: number
    avg_mood?: string
    avg_energy?: string
    habits_rate?: number
    goals_count?: number
    goals_progress?: number
    domains?: string[]
  }): Promise<string | null> => {
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('assistant-chat', {
        body: {
          mode: 'weekly-insights',
          messages: [],
          data: metrics,
        },
      })

      if (error) throw error
      const reply = data?.reply ?? null
      setInsights(reply)
      return reply
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate insights'
      if (msg.includes('RATE_LIMITED')) {
        toast.error('AI rate limited. Try again in a moment.')
      }
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { generateInsights, insights, loading }
}
