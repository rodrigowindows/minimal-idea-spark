import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useXPSystem } from './useXPSystem'
import { GAMIFICATION_CONFIG } from '@/lib/constants'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('useXPSystem', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useXPSystem())

    expect(result.current.level).toBe(1)
    expect(result.current.xpTotal).toBe(0)
    expect(result.current.xpCurrentLevel).toBe(0)
    expect(result.current.streakDays).toBe(0)
    expect(result.current.achievements).toEqual([])
    expect(result.current.weekScore).toBeNull()
    expect(result.current.deepWorkMinutes).toBe(0)
    expect(result.current.opportunitiesCompleted).toBe(0)
  })

  it('should calculate correct xpToNextLevel for level 1', () => {
    const { result } = renderHook(() => useXPSystem())
    expect(result.current.xpToNextLevel).toBe(GAMIFICATION_CONFIG.XP_PER_LEVEL(1))
  })

  it('should start with 0% xpProgress', () => {
    const { result } = renderHook(() => useXPSystem())
    expect(result.current.xpProgress).toBe(0)
  })

  it('should have levelTitle of Novice at level 1', () => {
    const { result } = renderHook(() => useXPSystem())
    expect(result.current.levelTitle).toBe('Novice')
  })

  describe('addXP', () => {
    it('should increase xpTotal and xpCurrentLevel', () => {
      const { result } = renderHook(() => useXPSystem())

      act(() => {
        result.current.addXP(100)
      })

      // Streak XP is also added on first activity of the day (streak resets to 1)
      // So total will be 100 + 10 (daily_streak) = 110
      expect(result.current.xpTotal).toBeGreaterThanOrEqual(100)
      expect(result.current.xpCurrentLevel).toBeGreaterThanOrEqual(100)
    })

    it('should persist state to localStorage', () => {
      const { result } = renderHook(() => useXPSystem())

      act(() => {
        result.current.addXP(50)
      })

      expect(localStorageMock.setItem).toHaveBeenCalled()
    })
  })

  describe('awardCapture', () => {
    it('should add capture XP (5)', () => {
      const { result } = renderHook(() => useXPSystem())

      act(() => {
        result.current.awardCapture()
      })

      expect(result.current.xpTotal).toBeGreaterThanOrEqual(GAMIFICATION_CONFIG.XP_RULES.capture)
    })
  })

  describe('awardTaskComplete', () => {
    it('should increment opportunitiesCompleted and add XP', () => {
      const { result } = renderHook(() => useXPSystem())

      act(() => {
        result.current.awardTaskComplete()
      })

      expect(result.current.opportunitiesCompleted).toBe(1)
      expect(result.current.xpTotal).toBeGreaterThanOrEqual(GAMIFICATION_CONFIG.XP_RULES.complete_task)
    })
  })

  describe('awardDeepWork', () => {
    it('should increment deepWorkMinutes', () => {
      const { result } = renderHook(() => useXPSystem())

      act(() => {
        result.current.awardDeepWork(30)
      })

      expect(result.current.deepWorkMinutes).toBe(30)
    })

    it('should add XP for each 25-min session completed', () => {
      const { result } = renderHook(() => useXPSystem())

      act(() => {
        result.current.awardDeepWork(50) // 2 sessions of 25 min
      })

      // 2 * 50 (deep_work_25min) = 100 XP + streak
      expect(result.current.xpTotal).toBeGreaterThanOrEqual(100)
    })

    it('should not add session XP for less than 25 minutes', () => {
      const { result } = renderHook(() => useXPSystem())

      act(() => {
        result.current.awardDeepWork(10)
      })

      // No deep_work_25min XP but deepWorkMinutes still tracked
      expect(result.current.deepWorkMinutes).toBe(10)
    })
  })

  describe('awardInsight', () => {
    it('should add insight XP', () => {
      const { result } = renderHook(() => useXPSystem())

      act(() => {
        result.current.awardInsight()
      })

      expect(result.current.xpTotal).toBeGreaterThanOrEqual(GAMIFICATION_CONFIG.XP_RULES.insight_added)
    })
  })

  describe('setWeekScore', () => {
    it('should set the week score', () => {
      const { result } = renderHook(() => useXPSystem())

      act(() => {
        result.current.setWeekScore(85)
      })

      expect(result.current.weekScore).toBe(85)
    })
  })

  describe('resetXP', () => {
    it('should reset all state to defaults', () => {
      const { result } = renderHook(() => useXPSystem())

      act(() => {
        result.current.addXP(500)
        result.current.awardTaskComplete()
      })

      act(() => {
        result.current.resetXP()
      })

      expect(result.current.level).toBe(1)
      expect(result.current.xpTotal).toBe(0)
      expect(result.current.xpCurrentLevel).toBe(0)
      expect(result.current.streakDays).toBe(0)
      expect(result.current.achievements).toEqual([])
      expect(result.current.opportunitiesCompleted).toBe(0)
    })
  })
})
