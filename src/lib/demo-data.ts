const DEMO_OPPORTUNITIES = [
  {
    id: 'demo-opp-1',
    title: 'Study React Server Components',
    type: 'Study',
    domain: 'Career',
    status: 'doing',
    strategic_value: 9,
    priority: 'high',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    user_id: 'mock-user-001',
  },
  {
    id: 'demo-opp-2',
    title: 'Morning exercise routine',
    type: 'Action',
    domain: 'Health',
    status: 'doing',
    strategic_value: 7,
    priority: 'medium',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    user_id: 'mock-user-001',
  },
  {
    id: 'demo-opp-3',
    title: 'Read "Atomic Habits"',
    type: 'Study',
    domain: 'Personal Growth',
    status: 'backlog',
    strategic_value: 8,
    priority: 'medium',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    user_id: 'mock-user-001',
  },
  {
    id: 'demo-opp-4',
    title: 'Update portfolio website',
    type: 'Action',
    domain: 'Career',
    status: 'review',
    strategic_value: 6,
    priority: 'low',
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    user_id: 'mock-user-001',
  },
  {
    id: 'demo-opp-5',
    title: 'Learn TypeScript generics',
    type: 'Study',
    domain: 'Career',
    status: 'done',
    strategic_value: 8,
    priority: 'high',
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    user_id: 'mock-user-001',
  },
]

const DEMO_JOURNAL = [
  {
    id: 'demo-journal-1',
    content: 'Had a very productive day. Completed the React project milestone and exercised for 30 minutes. Feeling energized!',
    mood: 'great',
    energy: 4,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    user_id: 'mock-user-001',
  },
  {
    id: 'demo-journal-2',
    content: 'Bit tired today but managed to read 2 chapters of Atomic Habits. The concept of habit stacking is powerful.',
    mood: 'neutral',
    energy: 2,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    user_id: 'mock-user-001',
  },
  {
    id: 'demo-journal-3',
    content: 'Breakthrough moment in learning! Finally understood advanced TypeScript patterns. Feeling accomplished.',
    mood: 'great',
    energy: 5,
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    user_id: 'mock-user-001',
  },
]

const DEMO_HABITS = [
  { id: 'demo-habit-1', name: 'Morning meditation', frequency: 'daily', domain: 'Health', color: '#22c55e', streak: 5, user_id: 'mock-user-001' },
  { id: 'demo-habit-2', name: 'Read 20 pages', frequency: 'daily', domain: 'Personal Growth', color: '#3b82f6', streak: 12, user_id: 'mock-user-001' },
  { id: 'demo-habit-3', name: 'Code practice', frequency: 'daily', domain: 'Career', color: '#a855f7', streak: 8, user_id: 'mock-user-001' },
]

const DEMO_GOALS = [
  {
    id: 'demo-goal-1',
    title: 'Master TypeScript',
    description: 'Achieve advanced proficiency in TypeScript including generics, decorators, and type gymnastics.',
    domain: 'Career',
    target_date: new Date(Date.now() + 60 * 86400000).toISOString(),
    milestones: ['Basic types', 'Generics', 'Utility types', 'Advanced patterns'],
    milestone_status: [true, true, false, false],
    user_id: 'mock-user-001',
  },
  {
    id: 'demo-goal-2',
    title: 'Run a half marathon',
    description: 'Train progressively to complete a 21km race.',
    domain: 'Health',
    target_date: new Date(Date.now() + 120 * 86400000).toISOString(),
    milestones: ['5km comfortable', '10km race', '15km training', '21km race day'],
    milestone_status: [true, false, false, false],
    user_id: 'mock-user-001',
  },
]

const STORAGE_KEYS = {
  opportunities: 'lifeos_opportunities',
  journal: 'lifeos_journal_entries',
  habits: 'lifeos_habits',
  goals: 'lifeos_goals',
} as const

const DEMO_BACKUP_KEY = 'lifeos_demo_backup'

export function loadDemoData() {
  // Backup current data before overwriting
  const backup: Record<string, string | null> = {}
  for (const key of Object.values(STORAGE_KEYS)) {
    backup[key] = localStorage.getItem(key)
  }
  localStorage.setItem(DEMO_BACKUP_KEY, JSON.stringify(backup))

  // Load demo data
  localStorage.setItem(STORAGE_KEYS.opportunities, JSON.stringify(DEMO_OPPORTUNITIES))
  localStorage.setItem(STORAGE_KEYS.journal, JSON.stringify(DEMO_JOURNAL))
  localStorage.setItem(STORAGE_KEYS.habits, JSON.stringify(DEMO_HABITS))
  localStorage.setItem(STORAGE_KEYS.goals, JSON.stringify(DEMO_GOALS))
  localStorage.setItem('lifeos_demo_mode', '1')
}

export function unloadDemoData() {
  try {
    const raw = localStorage.getItem(DEMO_BACKUP_KEY)
    if (raw) {
      const backup = JSON.parse(raw) as Record<string, string | null>
      for (const [key, value] of Object.entries(backup)) {
        if (value === null) {
          localStorage.removeItem(key)
        } else {
          localStorage.setItem(key, value)
        }
      }
      localStorage.removeItem(DEMO_BACKUP_KEY)
    }
  } catch {
    // If restore fails, just remove demo data
    for (const key of Object.values(STORAGE_KEYS)) {
      localStorage.removeItem(key)
    }
  }
  localStorage.removeItem('lifeos_demo_mode')
}

export function isDemoMode(): boolean {
  return localStorage.getItem('lifeos_demo_mode') === '1'
}
