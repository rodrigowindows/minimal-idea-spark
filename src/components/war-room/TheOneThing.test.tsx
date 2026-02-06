import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TheOneThing } from './TheOneThing'
import type { Opportunity, LifeDomain } from '@/types'

// Mock AppContext
const mockSetCurrentOpportunity = vi.fn()
const mockToggleDeepWorkMode = vi.fn()

vi.mock('@/contexts/AppContext', () => ({
  useAppContext: () => ({
    setCurrentOpportunity: mockSetCurrentOpportunity,
    toggleDeepWorkMode: mockToggleDeepWorkMode,
  }),
}))

const mockDomains: LifeDomain[] = [
  {
    id: 'domain-career',
    user_id: 'user-1',
    name: 'Career',
    color_theme: '#4f46e5',
    target_percentage: 30,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'domain-learning',
    user_id: 'user-1',
    name: 'Learning',
    color_theme: '#8b5cf6',
    target_percentage: 25,
    created_at: '2025-01-01T00:00:00Z',
  },
]

const mockOpportunities: Opportunity[] = [
  {
    id: 'opp-1',
    user_id: 'user-1',
    domain_id: 'domain-career',
    title: 'Build portfolio site',
    description: 'Create personal portfolio',
    type: 'action',
    status: 'doing',
    priority: 9,
    strategic_value: 8,
    created_at: '2025-06-01T10:00:00Z',
  },
  {
    id: 'opp-2',
    user_id: 'user-1',
    domain_id: 'domain-learning',
    title: 'Study for exam',
    description: 'Study hard',
    type: 'study',
    status: 'doing',
    priority: 10,
    strategic_value: 10,
    created_at: '2025-06-02T09:00:00Z',
  },
]

describe('TheOneThing', () => {
  describe('with empty data', () => {
    it('should show empty state when no opportunities', () => {
      render(<TheOneThing opportunities={[]} domains={mockDomains} />)

      expect(screen.getByText('The One Thing')).toBeInTheDocument()
      expect(screen.getByText(/no active opportunities/i)).toBeInTheDocument()
    })

    it('should show empty state when opportunities are all done', () => {
      const doneOpportunities: Opportunity[] = [
        {
          id: 'opp-done',
          user_id: 'user-1',
          domain_id: 'domain-career',
          title: 'Done task',
          description: null,
          type: 'action',
          status: 'done',
          priority: 5,
          strategic_value: 5,
          created_at: '2025-06-01T10:00:00Z',
        },
      ]

      render(<TheOneThing opportunities={doneOpportunities} domains={mockDomains} />)
      expect(screen.getByText(/no active opportunities/i)).toBeInTheDocument()
    })

    it('should show empty state with empty domains', () => {
      render(<TheOneThing opportunities={[]} domains={[]} />)
      expect(screen.getByText(/no active opportunities/i)).toBeInTheDocument()
    })
  })

  describe('with populated data', () => {
    it('should render the title "The One Thing"', () => {
      render(<TheOneThing opportunities={mockOpportunities} domains={mockDomains} />)
      expect(screen.getByText('The One Thing')).toBeInTheDocument()
    })

    it('should display the top priority opportunity title', () => {
      render(<TheOneThing opportunities={mockOpportunities} domains={mockDomains} />)

      // opp-2 has highest score: priority 10 * strategic_value 10 = 100
      expect(screen.getByText('Study for exam')).toBeInTheDocument()
    })

    it('should show the opportunity type as badge', () => {
      render(<TheOneThing opportunities={mockOpportunities} domains={mockDomains} />)
      expect(screen.getByText('study')).toBeInTheDocument()
    })

    it('should render the Focus button', () => {
      render(<TheOneThing opportunities={mockOpportunities} domains={mockDomains} />)
      expect(screen.getByRole('button', { name: /focus/i })).toBeInTheDocument()
    })

    it('should show priority stars', () => {
      render(<TheOneThing opportunities={mockOpportunities} domains={mockDomains} />)
      expect(screen.getByText('Priority')).toBeInTheDocument()
    })

    it('should show strategic value', () => {
      render(<TheOneThing opportunities={mockOpportunities} domains={mockDomains} />)
      expect(screen.getByText('Strategic Value')).toBeInTheDocument()
      expect(screen.getByText('10')).toBeInTheDocument()
    })

    it('should show domain name when domain is found', () => {
      render(<TheOneThing opportunities={mockOpportunities} domains={mockDomains} />)
      expect(screen.getByText('Learning')).toBeInTheDocument()
    })

    it('should call setCurrentOpportunity and toggleDeepWorkMode on Focus click', async () => {
      render(<TheOneThing opportunities={mockOpportunities} domains={mockDomains} />)

      const focusButton = screen.getByRole('button', { name: /focus/i })
      focusButton.click()

      expect(mockSetCurrentOpportunity).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Study for exam' })
      )
      expect(mockToggleDeepWorkMode).toHaveBeenCalled()
    })
  })

  describe('loading state', () => {
    it('should show skeleton loading when opportunities is undefined', () => {
      const { container } = render(
        <TheOneThing opportunities={undefined} domains={undefined} />
      )

      // Skeletons are rendered (no title text, no empty state)
      expect(screen.queryByText('The One Thing')).not.toBeInTheDocument()
      expect(screen.queryByText(/no active opportunities/i)).not.toBeInTheDocument()
      // Should have skeleton elements
      const skeletons = container.querySelectorAll('[class*="skeleton"], [class*="animate-pulse"]')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  describe('priority sorting', () => {
    it('should pick opportunity with highest priority * strategic_value score', () => {
      const opportunities: Opportunity[] = [
        {
          id: 'low-score',
          user_id: 'user-1',
          domain_id: 'domain-career',
          title: 'Low score task',
          description: null,
          type: 'action',
          status: 'doing',
          priority: 2,
          strategic_value: 1,
          created_at: '2025-06-01T10:00:00Z',
        },
        {
          id: 'high-score',
          user_id: 'user-1',
          domain_id: 'domain-career',
          title: 'High score task',
          description: null,
          type: 'action',
          status: 'backlog',
          priority: 8,
          strategic_value: 9,
          created_at: '2025-06-01T10:00:00Z',
        },
      ]

      render(<TheOneThing opportunities={opportunities} domains={mockDomains} />)
      expect(screen.getByText('High score task')).toBeInTheDocument()
    })

    it('should exclude review and done statuses', () => {
      const opportunities: Opportunity[] = [
        {
          id: 'review-item',
          user_id: 'user-1',
          domain_id: 'domain-career',
          title: 'Review task',
          description: null,
          type: 'action',
          status: 'review',
          priority: 10,
          strategic_value: 10,
          created_at: '2025-06-01T10:00:00Z',
        },
        {
          id: 'backlog-item',
          user_id: 'user-1',
          domain_id: 'domain-career',
          title: 'Backlog task',
          description: null,
          type: 'action',
          status: 'backlog',
          priority: 3,
          strategic_value: 2,
          created_at: '2025-06-01T10:00:00Z',
        },
      ]

      render(<TheOneThing opportunities={opportunities} domains={mockDomains} />)
      // review is excluded, so backlog task should show
      expect(screen.getByText('Backlog task')).toBeInTheDocument()
    })
  })
})
