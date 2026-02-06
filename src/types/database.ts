export interface UserProfile {
  id: string
  full_name: string | null
  macro_goals: string | null
  updated_at: string
}

export interface LifeDomain {
  id: string
  user_id: string
  name: string
  color_theme: string
  target_percentage?: number
  created_at: string
}

export type OpportunityTypeValue = 'action' | 'study' | 'insight' | 'networking'
export type OpportunityStatusValue = 'backlog' | 'doing' | 'review' | 'done'

export interface Opportunity {
  id: string
  user_id: string
  domain_id: string | null
  title: string
  description: string | null
  type: OpportunityTypeValue
  status: OpportunityStatusValue
  priority: number
  strategic_value: number | null
  xp_reward?: number
  created_at: string
  domain?: LifeDomain
}

export interface FocusSession {
  id: string
  user_id: string
  opportunity_id: string | null
  duration_minutes: number
  started_at: string
  notes: string | null
  xp_earned?: number
  opportunity?: Opportunity
}

export interface DailyLog {
  id: string
  user_id: string
  content: string
  mood: string | null
  energy_level: number | null
  log_date: string
  created_at: string
}

export interface KnowledgeBase {
  id: string
  user_id: string
  source_title: string | null
  content_chunk: string | null
  created_at: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  sources?: ContextSource[]
}

export interface ContextSource {
  title: string
  type: 'opportunity' | 'journal' | 'knowledge'
  relevance: number
  metadata?: Record<string, unknown>
}

export interface UserStats {
  current_xp: number
  level: number
  current_streak: number
  last_activity_date: string | null
  deep_work_minutes: number
}

export interface XPSummary {
  id: string
  user_id: string
  level: number
  xp_total: number
  xp_current_level: number
  streak_days: number
  achievements: Achievement[]
  week_score: number | null
  updated_at: string
}

export interface Achievement {
  id: string
  name: string
  icon: string
  xp_reward: number
  unlocked_at: string
}

export interface TimeBlock {
  id: string
  user_id: string
  opportunity_id: string | null
  block_start: string
  block_duration: number
  block_date: string
  created_at: string
  opportunity?: Opportunity
}

export interface AIProcessingResult {
  opportunities: {
    title: string
    type: OpportunityTypeValue
    domain: string
    priority: number
    strategic_value: number
    effort_minutes: number
  }[]
  xp_award: number
  mood: 'great' | 'good' | 'neutral' | 'bad' | 'terrible'
  energy_level: number
  insights: string[]
}

export interface WeeklyScorecard {
  xp_gained: number
  xp_gained_change: number
  opportunities_completed: number
  deep_work_hours: number
  domains_balance: Record<string, number>
  streak_length: number
  ai_accuracy: number
  overall_score: number
}

export interface ActivityEntry {
  date: string
  hour: number
  intensity: number
  type: 'deep_work' | 'task' | 'journal' | 'capture'
}
