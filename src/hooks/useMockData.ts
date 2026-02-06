import { useEffect, useState } from 'react'
import type { DailyLog, LifeDomain, Opportunity } from '@/types'

const MOCK_USER_ID = 'mock-user-001'

const mockDomains: LifeDomain[] = [
  { id: 'domain-career', user_id: MOCK_USER_ID, name: 'Career', color_theme: '#4f46e5', target_percentage: 30, created_at: '2025-01-01T00:00:00Z' },
  { id: 'domain-health', user_id: MOCK_USER_ID, name: 'Health', color_theme: '#10b981', target_percentage: 25, created_at: '2025-01-01T00:00:00Z' },
  { id: 'domain-finance', user_id: MOCK_USER_ID, name: 'Finance', color_theme: '#f59e0b', target_percentage: 20, created_at: '2025-01-01T00:00:00Z' },
  { id: 'domain-learning', user_id: MOCK_USER_ID, name: 'Learning', color_theme: '#8b5cf6', target_percentage: 25, created_at: '2025-01-01T00:00:00Z' },
]

const mockOpportunities: Opportunity[] = [
  { id: 'opp-001', user_id: MOCK_USER_ID, domain_id: 'domain-career', title: 'Prepare portfolio presentation', description: 'Create a compelling portfolio deck for upcoming client meetings', type: 'action', status: 'doing', priority: 9, strategic_value: 8, created_at: '2025-06-01T10:00:00Z', domain: mockDomains[0] },
  { id: 'opp-002', user_id: MOCK_USER_ID, domain_id: 'domain-learning', title: 'Study for SEFAZ exam', description: 'Deep dive into tax law and public finance modules', type: 'study', status: 'doing', priority: 10, strategic_value: 10, created_at: '2025-06-02T09:00:00Z', domain: mockDomains[3] },
  { id: 'opp-003', user_id: MOCK_USER_ID, domain_id: 'domain-health', title: 'Establish morning workout routine', description: 'Build a consistent 30-minute morning exercise habit', type: 'action', status: 'doing', priority: 8, strategic_value: 9, created_at: '2025-06-01T07:00:00Z', domain: mockDomains[1] },
  { id: 'opp-004', user_id: MOCK_USER_ID, domain_id: 'domain-health', title: 'Study sleep optimization techniques', description: 'Research evidence-based methods to improve sleep quality', type: 'study', status: 'review', priority: 7, strategic_value: 7, created_at: '2025-06-03T14:00:00Z', domain: mockDomains[1] },
  { id: 'opp-005', user_id: MOCK_USER_ID, domain_id: 'domain-finance', title: 'Review investment allocation', description: 'Rebalance portfolio based on current market conditions', type: 'action', status: 'backlog', priority: 7, strategic_value: 8, created_at: '2025-06-04T11:00:00Z', domain: mockDomains[2] },
  { id: 'opp-006', user_id: MOCK_USER_ID, domain_id: 'domain-finance', title: 'Insight: Compound growth realization', description: 'Key insight about long-term compounding effects on savings rate', type: 'insight', status: 'done', priority: 5, strategic_value: 6, created_at: '2025-05-28T16:00:00Z', domain: mockDomains[2] },
  { id: 'opp-007', user_id: MOCK_USER_ID, domain_id: 'domain-learning', title: 'Complete TypeScript advanced patterns course', description: 'Finish the advanced generics and type manipulation modules', type: 'study', status: 'doing', priority: 8, strategic_value: 7, created_at: '2025-06-01T08:00:00Z', domain: mockDomains[3] },
  { id: 'opp-008', user_id: MOCK_USER_ID, domain_id: 'domain-learning', title: 'Connect with study group members', description: 'Reach out to peers in the online learning community', type: 'networking', status: 'backlog', priority: 4, strategic_value: 3, created_at: '2025-06-05T13:00:00Z', domain: mockDomains[3] },
  { id: 'opp-009', user_id: MOCK_USER_ID, domain_id: 'domain-career', title: 'Attend networking event downtown', description: 'Meet potential collaborators at the tech meetup', type: 'networking', status: 'backlog', priority: 5, strategic_value: 5, created_at: '2025-06-06T18:00:00Z', domain: mockDomains[0] },
  { id: 'opp-010', user_id: MOCK_USER_ID, domain_id: 'domain-health', title: 'Meal prep for the week', description: 'Plan and prepare healthy meals for the upcoming week', type: 'action', status: 'done', priority: 6, strategic_value: 7, created_at: '2025-05-30T09:00:00Z', domain: mockDomains[1] },
  { id: 'opp-011', user_id: MOCK_USER_ID, domain_id: 'domain-learning', title: 'Learn Golang basics', description: 'Explore Go for potential blockchain projects', type: 'study', status: 'backlog', priority: 3, strategic_value: 2, created_at: '2025-06-07T10:00:00Z', domain: mockDomains[3] },
]

const mockDailyLogs: DailyLog[] = [
  { id: 'log-001', user_id: MOCK_USER_ID, content: 'Productive day. Finished the portfolio draft and had a solid workout session.', mood: 'great', energy_level: 9, log_date: '2025-06-06', created_at: '2025-06-06T22:00:00Z' },
  { id: 'log-002', user_id: MOCK_USER_ID, content: 'Struggled with focus in the afternoon. Morning routine went well but energy dipped after lunch.', mood: 'okay', energy_level: 5, log_date: '2025-06-05', created_at: '2025-06-05T21:30:00Z' },
  { id: 'log-003', user_id: MOCK_USER_ID, content: 'Great progress on the TypeScript course. Had an interesting insight about generics.', mood: 'good', energy_level: 7, log_date: '2025-06-04', created_at: '2025-06-04T20:45:00Z' },
  { id: 'log-004', user_id: MOCK_USER_ID, content: 'Rough start to the day. Overslept and missed morning routine. Caught up on reading in the evening.', mood: 'bad', energy_level: 3, log_date: '2025-06-03', created_at: '2025-06-03T23:00:00Z' },
]

interface MockData {
  domains: LifeDomain[]
  opportunities: Opportunity[]
  dailyLogs: DailyLog[]
  isLoading: boolean
}

export function useMockData(): MockData {
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<Omit<MockData, 'isLoading'>>({
    domains: [], opportunities: [], dailyLogs: [],
  })

  useEffect(() => {
    const timer = setTimeout(() => {
      setData({ domains: mockDomains, opportunities: mockOpportunities, dailyLogs: mockDailyLogs })
      setIsLoading(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  return { ...data, isLoading }
}
