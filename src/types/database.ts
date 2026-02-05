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
  created_at: string
}

export interface Opportunity {
  id: string
  user_id: string
  domain_id: string | null
  title: string
  description: string | null
  type: 'action' | 'study' | 'insight' | 'networking'
  status: 'backlog' | 'doing' | 'review' | 'done'
  priority: number
  strategic_value: number | null
  created_at: string
  domain?: LifeDomain
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
}

// XP System Types
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

// AI Processing Response
export interface AIProcessingResult {
  opportunities: {
    title: string
    type: 'action' | 'study' | 'insight' | 'networking' | 'health'
    domain: 'Career' | 'Health' | 'Finance' | 'Learning' | 'Relationships'
    priority: number
    strategic_value: number
    effort_minutes: number
  }[]
  xp_award: number
  mood: 'great' | 'good' | 'neutral' | 'bad' | 'terrible'
  energy_level: number
  insights: string[]
}

// Weekly Scorecard
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
