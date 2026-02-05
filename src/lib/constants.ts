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

// Gamification Configuration
export const GAMIFICATION_CONFIG = {
  // XP required per level (increases with level)
  XP_PER_LEVEL: (level: number) => 1000 + (level - 1) * 500,

  // XP rewards for different actions
  XP_RULES: {
    capture: 5,           // Log anything
    complete_task: 25,    // Finish opportunity
    daily_streak: 10,     // Login + 1 log/day
    weekly_goal: 100,     // 7+ days active
    deep_work_25min: 50,  // Pomodoro session
    insight_added: 15,    // Add an insight
    networking: 20,       // Networking activity
  },

  // Daily goals for engagement
  DAILY_GOALS: {
    min_logs: 3,
    min_deep_work: 50, // minutes
    domains_touched: 2,
  },

  // Achievement definitions
  ACHIEVEMENTS: [
    { name: 'First Steps', description: 'Reach 100 XP', xp_reward: 100, unlock_at_xp: 100, icon: 'footprints' },
    { name: 'Daily Master', description: '7-day streak', xp_reward: 250, unlock_at_streak: 7, icon: 'flame' },
    { name: 'Deep Worker', description: '300min deep work', xp_reward: 500, unlock_at_deep_work: 300, icon: 'brain' },
    { name: 'Century Club', description: 'Complete 100 opportunities', xp_reward: 1000, unlock_at_completed: 100, icon: 'trophy' },
    { name: 'Life Balanced', description: 'Touch all domains in a day', xp_reward: 150, unlock_at_domains: 5, icon: 'scale' },
    { name: 'Insight Hunter', description: 'Log 50 insights', xp_reward: 300, unlock_at_insights: 50, icon: 'lightbulb' },
    { name: 'Week Champion', description: 'Score 90+ on weekly scorecard', xp_reward: 500, unlock_at_week_score: 90, icon: 'crown' },
  ],

  // Level titles
  LEVEL_TITLES: [
    'Novice',           // 1
    'Apprentice',       // 2
    'Explorer',         // 3
    'Practitioner',     // 4
    'Strategist',       // 5
    'Expert',           // 6
    'Master',           // 7
    'Grandmaster',      // 8
    'Sage',             // 9
    'Legend',           // 10+
  ] as const,
} as const

// Time Block defaults
export const TIME_BLOCK_DEFAULTS = {
  DEFAULT_DURATION: 25, // minutes (Pomodoro)
  BREAK_DURATION: 5,    // minutes
  LONG_BREAK_DURATION: 15, // minutes after 4 pomodoros
  MIN_BLOCK_DURATION: 15,
  MAX_BLOCK_DURATION: 240,
} as const

// Weekly Scorecard thresholds
export const SCORECARD_THRESHOLDS = {
  XP_GOAL_DAILY: 100,
  OPPORTUNITIES_GOAL_WEEKLY: 5,
  DEEP_WORK_GOAL_WEEKLY: 10, // hours
  DOMAIN_BALANCE_MAX: 40, // no domain > 40%
} as const
