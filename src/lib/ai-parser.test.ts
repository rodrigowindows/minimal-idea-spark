import { describe, it, expect } from 'vitest'
import { calculateXPReward, GAMIFICATION_CONFIG } from './constants'

describe('calculateXPReward', () => {
  it('should calculate XP for study type with high strategic value', () => {
    // study base = 50, strategic value 10 → 50 * 10 = 500
    expect(calculateXPReward('study', 10)).toBe(500)
  })

  it('should calculate XP for action type', () => {
    // action base = 30, strategic value 5 → 30 * 5 = 150
    expect(calculateXPReward('action', 5)).toBe(150)
  })

  it('should calculate XP for networking type', () => {
    // networking base = 20, strategic value 4 → 20 * 4 = 80
    expect(calculateXPReward('networking', 4)).toBe(80)
  })

  it('should calculate XP for insight type', () => {
    // insight base = 10, strategic value 6 → 10 * 6 = 60
    expect(calculateXPReward('insight', 6)).toBe(60)
  })

  it('should clamp strategic value to minimum 1', () => {
    // action base = 30, strategic value clamped to 1 → 30
    expect(calculateXPReward('action', 0)).toBe(30)
    expect(calculateXPReward('action', -5)).toBe(30)
  })

  it('should clamp strategic value to maximum 10', () => {
    // study base = 50, strategic value clamped to 10 → 500
    expect(calculateXPReward('study', 15)).toBe(500)
    expect(calculateXPReward('study', 100)).toBe(500)
  })

  it('should use fallback base XP of 10 for unknown types', () => {
    // unknown type → base 10, strategic value 5 → 50
    expect(calculateXPReward('unknown', 5)).toBe(50)
  })

  it('should handle case-insensitive type names', () => {
    expect(calculateXPReward('Study', 10)).toBe(500)
    expect(calculateXPReward('ACTION', 5)).toBe(150)
  })
})

describe('GAMIFICATION_CONFIG', () => {
  describe('XP_PER_LEVEL', () => {
    it('should return correct XP for level 1', () => {
      expect(GAMIFICATION_CONFIG.XP_PER_LEVEL(1)).toBe(1000)
    })

    it('should increase XP needed as level grows', () => {
      const level1 = GAMIFICATION_CONFIG.XP_PER_LEVEL(1)
      const level2 = GAMIFICATION_CONFIG.XP_PER_LEVEL(2)
      const level5 = GAMIFICATION_CONFIG.XP_PER_LEVEL(5)
      expect(level2).toBeGreaterThan(level1)
      expect(level5).toBeGreaterThan(level2)
    })

    it('should follow formula 1000 * level^1.5', () => {
      expect(GAMIFICATION_CONFIG.XP_PER_LEVEL(4)).toBe(Math.round(1000 * Math.pow(4, 1.5)))
    })
  })

  describe('XP_RULES', () => {
    it('should have correct capture XP', () => {
      expect(GAMIFICATION_CONFIG.XP_RULES.capture).toBe(5)
    })

    it('should have correct complete_task XP', () => {
      expect(GAMIFICATION_CONFIG.XP_RULES.complete_task).toBe(25)
    })

    it('should have correct deep_work_25min XP', () => {
      expect(GAMIFICATION_CONFIG.XP_RULES.deep_work_25min).toBe(50)
    })
  })

  describe('LEVEL_TITLES', () => {
    it('should have 10 level titles', () => {
      expect(GAMIFICATION_CONFIG.LEVEL_TITLES).toHaveLength(10)
    })

    it('should start with Novice and end with Legend', () => {
      expect(GAMIFICATION_CONFIG.LEVEL_TITLES[0]).toBe('Novice')
      expect(GAMIFICATION_CONFIG.LEVEL_TITLES[9]).toBe('Legend')
    })
  })

  describe('ACHIEVEMENTS', () => {
    it('should have defined achievements', () => {
      expect(GAMIFICATION_CONFIG.ACHIEVEMENTS.length).toBeGreaterThan(0)
    })

    it('each achievement should have name, description, and xp_reward', () => {
      for (const achievement of GAMIFICATION_CONFIG.ACHIEVEMENTS) {
        expect(achievement.name).toBeTruthy()
        expect(achievement.description).toBeTruthy()
        expect(achievement.xp_reward).toBeGreaterThan(0)
      }
    })
  })
})
