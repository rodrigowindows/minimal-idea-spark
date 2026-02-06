export const OPPORTUNITY_TYPES = ['Action', 'Study', 'Insight', 'Networking'] as const
export type OpportunityType = (typeof OPPORTUNITY_TYPES)[number]

export const OPPORTUNITY_STATUSES = ['Backlog', 'Doing', 'Review', 'Done'] as const
export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number]

export const STATUS_COLORS: Record<OpportunityStatus, string> = {
  Backlog: '#6b7280',
  Doing: '#3b82f6',
  Review: '#f59e0b',
  Done: '#22c55e',
}

export const TYPE_ICONS: Record<OpportunityType, string> = {
  Action: 'Zap',
  Study: 'BookOpen',
  Insight: 'Lightbulb',
  Networking: 'Users',
}

export const MOOD_OPTIONS = [
  { value: 'great', label: 'Great', emoji: '😄' },
  { value: 'good', label: 'Good', emoji: '🙂' },
  { value: 'okay', label: 'Okay', emoji: '😐' },
  { value: 'bad', label: 'Bad', emoji: '😔' },
  { value: 'terrible', label: 'Terrible', emoji: '😫' },
] as const

export const DEFAULT_DOMAIN_COLORS = [
  '#3b82f6', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899',
  '#06b6d4', '#f97316', '#14b8a6', '#6366f1',
] as const

// Gamification Configuration - XP = Base XP * Strategic Value
export const GAMIFICATION_CONFIG = {
  // Level N requires 1000 * (N^1.5) XP
  XP_FOR_LEVEL: (level: number) => Math.round(1000 * Math.pow(level, 1.5)),
  XP_PER_LEVEL: (level: number) => Math.round(1000 * Math.pow(level, 1.5)),

  // Base XP per type (multiplied by strategic_value 1-10)
  BASE_XP: {
    study: 50,
    action: 30,
    networking: 20,
    insight: 10,
  } as Record<string, number>,

  // XP rewards for non-opportunity actions
  XP_RULES: {
    capture: 5 as number,
    complete_task: 25 as number,
    daily_streak: 10 as number,
    weekly_goal: 100 as number,
    deep_work_25min: 50 as number,
    deep_work_per_minute: 2 as number,
    insight_added: 15 as number,
    networking: 20 as number,
  },

  DAILY_GOALS: {
    min_logs: 3,
    min_deep_work: 50,
    domains_touched: 2,
  },

  ACHIEVEMENTS: [
    { name: 'First Steps', description: 'Reach 100 XP', xp_reward: 100, unlock_at_xp: 100, icon: 'footprints' },
    { name: 'Rising Star', description: 'Reach 500 XP', xp_reward: 150, unlock_at_xp: 500, icon: 'star' },
    { name: 'XP Machine', description: 'Reach 2000 XP', xp_reward: 300, unlock_at_xp: 2000, icon: 'zap' },
    { name: 'Daily Master', description: '7-day streak', xp_reward: 250, unlock_at_streak: 7, icon: 'flame' },
    { name: 'Unstoppable', description: '30-day streak', xp_reward: 750, unlock_at_streak: 30, icon: 'flame' },
    { name: 'Deep Worker', description: '300min deep work', xp_reward: 500, unlock_at_deep_work: 300, icon: 'brain' },
    { name: 'Flow State Master', description: '1000min deep work', xp_reward: 1000, unlock_at_deep_work: 1000, icon: 'brain' },
    { name: 'First Ten', description: 'Complete 10 opportunities', xp_reward: 200, unlock_at_completed: 10, icon: 'trophy' },
    { name: 'Century Club', description: 'Complete 100 opportunities', xp_reward: 1000, unlock_at_completed: 100, icon: 'trophy' },
    { name: 'Life Balanced', description: 'Touch all domains in a day', xp_reward: 150, unlock_at_domains: 5, icon: 'scale' },
    { name: 'Insight Hunter', description: 'Log 50 insights', xp_reward: 300, unlock_at_insights: 50, icon: 'lightbulb' },
    { name: 'Week Champion', description: 'Score 90+ on weekly scorecard', xp_reward: 500, unlock_at_week_score: 90, icon: 'crown' },
  ],

  LEVEL_TITLES: [
    'Novice',
    'Apprentice',
    'Explorer',
    'Practitioner',
    'Strategist',
    'Expert',
    'Master',
    'Grandmaster',
    'Sage',
    'Legend',
  ] as const,
} as const

/**
 * Calculate XP reward: Base XP * Strategic Value
 * Study (50) * Valor 10 = 500 XP
 * Action (30) * Valor 2 = 60 XP
 */
export function calculateXPReward(type: string, strategicValue: number): number {
  const base = GAMIFICATION_CONFIG.BASE_XP[type.toLowerCase()] ?? 10
  const sv = Math.max(1, Math.min(10, strategicValue))
  return base * sv
}

export const TIME_BLOCK_DEFAULTS = {
  DEFAULT_DURATION: 25,
  BREAK_DURATION: 5,
  LONG_BREAK_DURATION: 15,
  MIN_BLOCK_DURATION: 15,
  MAX_BLOCK_DURATION: 240,
} as const

export const SCORECARD_THRESHOLDS = {
  XP_GOAL_DAILY: 100,
  OPPORTUNITIES_GOAL_WEEKLY: 5,
  DEEP_WORK_GOAL_WEEKLY: 10,
  DOMAIN_BALANCE_MAX: 40,
  BURNOUT_THRESHOLD: 40,
} as const
