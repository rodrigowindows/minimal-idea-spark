import { describe, it, expect, vi, beforeEach } from 'vitest'
import { searchLocal, semanticSearch, textSearch } from './semantic-search'

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({ error: null }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
        ilike: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    }),
  },
}))

// Mock indexer
vi.mock('./indexer', () => ({
  loadSearchIndex: vi.fn(() => [
    {
      id: '1',
      type: 'opportunity',
      title: 'Build React app',
      content: 'Build React app with TypeScript',
      tags: ['action'],
      created_at: '2025-01-01',
      metadata: {},
      relevance: 0,
    },
    {
      id: '2',
      type: 'journal',
      title: 'Journal - 2025-01-02',
      content: 'Great day, learned about Python',
      tags: [],
      created_at: '2025-01-02',
      metadata: {},
      relevance: 0,
    },
  ]),
  localSearch: vi.fn((_index, query) => {
    const items = [
      { id: '1', type: 'opportunity', title: 'Build React app', content: 'Build React app with TypeScript', tags: ['action'], created_at: '2025-01-01', metadata: {}, relevance: 1 },
      { id: '2', type: 'journal', title: 'Journal - 2025-01-02', content: 'Great day, learned about Python', tags: [], created_at: '2025-01-02', metadata: {}, relevance: 0.5 },
    ]
    return items.filter(i => i.content.toLowerCase().includes(query.toLowerCase()))
  }),
  getSuggestions: vi.fn(() => ['react', 'typescript']),
}))

describe('semantic-search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('searchLocal', () => {
    it('should return results matching query', () => {
      const results = searchLocal('React')
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].title).toContain('React')
    })

    it('should return empty for non-matching query', () => {
      const results = searchLocal('zzzznonexistent')
      expect(results).toHaveLength(0)
    })
  })

  describe('semanticSearch', () => {
    it('should delegate to local search', async () => {
      const results = await semanticSearch('React')
      expect(results.length).toBeGreaterThan(0)
    })
  })

  describe('textSearch', () => {
    it('should delegate to local search', async () => {
      const results = await textSearch('Python')
      expect(results.length).toBeGreaterThan(0)
    })
  })
})
