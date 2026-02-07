import { supabase } from '@/integrations/supabase/client'

export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low'
export type PriorityStatus = 'active' | 'completed' | 'archived'
export type PriorityCategory = 'career' | 'health' | 'finance' | 'learning' | 'family' | 'personal' | 'custom'

export interface Priority {
  id: string
  user_id: string
  title: string
  description: string
  priority_level: PriorityLevel
  category: PriorityCategory
  due_date?: string
  status: PriorityStatus
  embedding?: number[]
  progress: number // 0-100
  key_results: KeyResult[]
  ai_suggestions: string[]
  last_evaluated_at?: string
  created_at: string
  updated_at: string
}

export interface KeyResult {
  id: string
  title: string
  target: number
  current: number
  unit: string
  done: boolean
}

export interface GoalContext {
  priorities: Priority[]
  activeGoals: string[]
  recentActions: string[]
  userPreferences: Record<string, any>
}

export interface PriorityInsight {
  type: 'alignment' | 'risk' | 'suggestion' | 'progress'
  message: string
  relatedPriorityId?: string
  severity: 'info' | 'warning' | 'success'
}

const PRIORITY_LEVEL_ORDER: Record<PriorityLevel, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

export function sortPriorities(priorities: Priority[]): Priority[] {
  return [...priorities].sort((a, b) => {
    const levelDiff = PRIORITY_LEVEL_ORDER[a.priority_level] - PRIORITY_LEVEL_ORDER[b.priority_level]
    if (levelDiff !== 0) return levelDiff
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  })
}

export function buildPriorityContextString(priorities: Priority[]): string {
  const active = priorities.filter(p => p.status === 'active')
  if (active.length === 0) return 'No active priorities set.'

  const sorted = sortPriorities(active)
  const lines = sorted.map((p, i) => {
    const kr = p.key_results.length > 0
      ? ` | Key Results: ${p.key_results.map(k => `${k.title}: ${k.current}/${k.target} ${k.unit}`).join(', ')}`
      : ''
    return `${i + 1}. [${p.priority_level.toUpperCase()}] ${p.title} (${p.category}, ${p.progress}% done)${kr}: ${p.description}`
  })

  return `Current User Priorities:\n${lines.join('\n')}\n\nAlways consider these priorities when providing suggestions or taking actions.`
}

export function generatePriorityInsights(
  priorities: Priority[],
  opportunities: Array<{ title: string; status: string; type: string; strategic_value: number | null }>,
  goals: Array<{ title: string; progress: number; milestones: { done: boolean }[] }>,
): PriorityInsight[] {
  const insights: PriorityInsight[] = []
  const active = priorities.filter(p => p.status === 'active')

  // Check for overdue priorities
  const now = new Date()
  for (const p of active) {
    if (p.due_date && new Date(p.due_date) < now) {
      insights.push({
        type: 'risk',
        message: `"${p.title}" is past its due date. Consider reevaluating or archiving.`,
        relatedPriorityId: p.id,
        severity: 'warning',
      })
    }
  }

  // Check for stale priorities (no update in 7+ days)
  for (const p of active) {
    const daysSinceUpdate = Math.floor((now.getTime() - new Date(p.updated_at).getTime()) / (1000 * 60 * 60 * 24))
    if (daysSinceUpdate > 7) {
      insights.push({
        type: 'risk',
        message: `"${p.title}" hasn't been updated in ${daysSinceUpdate} days. Review progress.`,
        relatedPriorityId: p.id,
        severity: 'warning',
      })
    }
  }

  // Check for critical priorities without key results
  for (const p of active) {
    if (p.priority_level === 'critical' && p.key_results.length === 0) {
      insights.push({
        type: 'suggestion',
        message: `Critical priority "${p.title}" has no key results. Add measurable outcomes.`,
        relatedPriorityId: p.id,
        severity: 'info',
      })
    }
  }

  // Check alignment between priorities and in-progress tasks
  const doingTasks = opportunities.filter(o => o.status === 'doing')
  if (active.length > 0 && doingTasks.length > 0) {
    const criticalPriorities = active.filter(p => p.priority_level === 'critical')
    if (criticalPriorities.length > 0) {
      const hasHighSVDoing = doingTasks.some(t => (t.strategic_value ?? 0) >= 8)
      if (!hasHighSVDoing) {
        insights.push({
          type: 'alignment',
          message: 'You have critical priorities but no high-value tasks in progress. Consider reprioritizing.',
          severity: 'warning',
        })
      }
    }
  }

  // Progress milestones
  for (const p of active) {
    if (p.progress >= 75 && p.progress < 100) {
      insights.push({
        type: 'progress',
        message: `"${p.title}" is at ${p.progress}% - almost there! Push to complete.`,
        relatedPriorityId: p.id,
        severity: 'success',
      })
    }
  }

  // Category balance check
  const categoryCounts: Record<string, number> = {}
  for (const p of active) {
    categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1
  }
  const totalActive = active.length
  if (totalActive >= 3) {
    for (const [cat, count] of Object.entries(categoryCounts)) {
      const pct = (count / totalActive) * 100
      if (pct > 60) {
        insights.push({
          type: 'alignment',
          message: `${Math.round(pct)}% of priorities are in "${cat}". Consider diversifying.`,
          severity: 'info',
        })
      }
    }
  }

  return insights
}

// --- Supabase-backed functions (used when Supabase is configured) ---

export async function getUserPrioritiesFromDB(userId: string): Promise<Priority[]> {
  const { data, error } = await supabase
    .from('user_priorities')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('priority_level', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function addPriorityToDB(
  userId: string,
  priority: Omit<Priority, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<Priority> {
  const { data, error } = await supabase
    .from('user_priorities')
    .insert({ user_id: userId, ...priority })
    .select()
    .single()

  if (error) throw error

  // Generate embedding
  try {
    await generatePriorityEmbedding(data.id, `${priority.title} ${priority.description}`)
  } catch (e) {
    console.warn('Could not generate embedding for priority:', e)
  }

  return data
}

export async function generatePriorityEmbedding(priorityId: string, text: string) {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-embedding`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify({ text }),
    }
  )

  const { embedding } = await response.json()
  await supabase
    .from('user_priorities')
    .update({ embedding })
    .eq('id', priorityId)
}

export async function suggestActionsFromAPI(
  userId: string,
  currentContext: string,
  priorities: Priority[],
): Promise<string[]> {
  if (priorities.length === 0) return []

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rag-priority`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify({ user_id: userId, context: currentContext, priorities }),
    }
  )

  const data = await response.json()
  return data.suggestions || []
}

export async function reevaluatePrioritiesViaAPI(userId: string, priorities: Priority[]): Promise<void> {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rag-priority`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify({ action: 'reevaluate', user_id: userId, priorities }),
    }
  )

  const { updated_priorities } = await response.json()
  for (const priority of updated_priorities) {
    await supabase
      .from('user_priorities')
      .update({
        priority_level: priority.priority_level,
        updated_at: new Date().toISOString(),
      })
      .eq('id', priority.id)
  }
}
