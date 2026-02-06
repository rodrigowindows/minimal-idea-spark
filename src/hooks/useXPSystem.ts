import { useState, useCallback, useMemo, useRef } from 'react'
import { GAMIFICATION_CONFIG } from '@/lib/constants'
import type { Achievement } from '@/types'

interface XPState {
  level: number
  xpTotal: number
  xpCurrentLevel: number
  streakDays: number
  achievements: Achievement[]
  weekScore: number | null
  deepWorkMinutes: number
  opportunitiesCompleted: number
  insightsLogged: number
  lastActivityDate: string | null
}

// Global event bus for XP events so any component can listen
type XPEventListener = (event: { type: 'xp_gained' | 'level_up' | 'achievement'; amount?: number; level?: number; achievement?: Achievement }) => void
const xpListeners = new Set<XPEventListener>()
export function onXPEvent(listener: XPEventListener) {
  xpListeners.add(listener)
  return () => { xpListeners.delete(listener) }
}
function emitXPEvent(event: Parameters<XPEventListener>[0]) {
  xpListeners.forEach(fn => fn(event))
}

const STORAGE_KEY = 'minimal_idea_spark_xp_state'

function getInitialState(): XPState {
  if (typeof window === 'undefined') {
    return createDefaultState()
  }

  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      return createDefaultState()
    }
  }
  return createDefaultState()
}

function createDefaultState(): XPState {
  return {
    level: 1,
    xpTotal: 0,
    xpCurrentLevel: 0,
    streakDays: 0,
    achievements: [],
    weekScore: null,
    deepWorkMinutes: 0,
    opportunitiesCompleted: 0,
    insightsLogged: 0,
    lastActivityDate: null,
  }
}

export function useXPSystem() {
  const [state, setState] = useState<XPState>(getInitialState)

  const xpToNextLevel = useMemo(
    () => GAMIFICATION_CONFIG.XP_PER_LEVEL(state.level),
    [state.level]
  )

  const xpProgress = useMemo(
    () => Math.min((state.xpCurrentLevel / xpToNextLevel) * 100, 100),
    [state.xpCurrentLevel, xpToNextLevel]
  )

  const levelTitle = useMemo(() => {
    const titles = GAMIFICATION_CONFIG.LEVEL_TITLES
    const index = Math.min(state.level - 1, titles.length - 1)
    return titles[index]
  }, [state.level])

  const persistState = useCallback((newState: XPState) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState))
  }, [])

  const checkAndUnlockAchievements = useCallback((currentState: XPState): Achievement[] => {
    const newAchievements: Achievement[] = []
    const unlockedNames = new Set(currentState.achievements.map(a => a.name))

    for (const def of GAMIFICATION_CONFIG.ACHIEVEMENTS) {
      if (unlockedNames.has(def.name)) continue

      let shouldUnlock = false

      if ('unlock_at_xp' in def && currentState.xpTotal >= def.unlock_at_xp) {
        shouldUnlock = true
      }
      if ('unlock_at_streak' in def && currentState.streakDays >= def.unlock_at_streak) {
        shouldUnlock = true
      }
      if ('unlock_at_deep_work' in def && currentState.deepWorkMinutes >= def.unlock_at_deep_work) {
        shouldUnlock = true
      }
      if ('unlock_at_completed' in def && currentState.opportunitiesCompleted >= def.unlock_at_completed) {
        shouldUnlock = true
      }
      if ('unlock_at_insights' in def && currentState.insightsLogged >= def.unlock_at_insights) {
        shouldUnlock = true
      }
      if ('unlock_at_week_score' in def && currentState.weekScore && currentState.weekScore >= def.unlock_at_week_score) {
        shouldUnlock = true
      }

      if (shouldUnlock) {
        newAchievements.push({
          id: `achievement-${Date.now()}-${def.name}`,
          name: def.name,
          icon: def.icon,
          xp_reward: def.xp_reward,
          unlocked_at: new Date().toISOString(),
        })
      }
    }

    return newAchievements
  }, [])

  const addXP = useCallback((amount: number, reason?: string) => {
    setState(prev => {
      let newXpTotal = prev.xpTotal + amount
      let newXpCurrentLevel = prev.xpCurrentLevel + amount
      let newLevel = prev.level
      let leveledUp = false

      // Check for level up
      while (newXpCurrentLevel >= GAMIFICATION_CONFIG.XP_PER_LEVEL(newLevel)) {
        newXpCurrentLevel -= GAMIFICATION_CONFIG.XP_PER_LEVEL(newLevel)
        newLevel++
        leveledUp = true
      }

      // Update streak
      const today = new Date().toISOString().split('T')[0]
      const lastDate = prev.lastActivityDate
      let newStreakDays = prev.streakDays

      if (lastDate !== today) {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]

        if (lastDate === yesterdayStr) {
          newStreakDays = prev.streakDays + 1
          // Award streak bonus
          newXpTotal += GAMIFICATION_CONFIG.XP_RULES.daily_streak
          newXpCurrentLevel += GAMIFICATION_CONFIG.XP_RULES.daily_streak
        } else if (lastDate !== today) {
          newStreakDays = 1
        }
      }

      const newState: XPState = {
        ...prev,
        xpTotal: newXpTotal,
        xpCurrentLevel: newXpCurrentLevel,
        level: newLevel,
        streakDays: newStreakDays,
        lastActivityDate: today,
      }

      // Check for new achievements
      const newAchievements = checkAndUnlockAchievements(newState)
      if (newAchievements.length > 0) {
        newState.achievements = [...prev.achievements, ...newAchievements]
        // Add achievement XP
        const achievementXP = newAchievements.reduce((sum, a) => sum + a.xp_reward, 0)
        newState.xpTotal += achievementXP
        newState.xpCurrentLevel += achievementXP
      }

      persistState(newState)

      // Emit global XP events (deferred to avoid setState-in-render)
      setTimeout(() => {
        emitXPEvent({ type: 'xp_gained', amount })
        if (leveledUp) {
          emitXPEvent({ type: 'level_up', level: newLevel })
        }
        newAchievements.forEach(a => {
          emitXPEvent({ type: 'achievement', achievement: a })
        })
      }, 0)

      return newState
    })
  }, [persistState, checkAndUnlockAchievements])

  const awardCapture = useCallback(() => {
    addXP(GAMIFICATION_CONFIG.XP_RULES.capture, 'capture')
  }, [addXP])

  const awardTaskComplete = useCallback(() => {
    setState(prev => {
      const newState = { ...prev, opportunitiesCompleted: prev.opportunitiesCompleted + 1 }
      persistState(newState)
      return newState
    })
    addXP(GAMIFICATION_CONFIG.XP_RULES.complete_task, 'task_complete')
  }, [addXP, persistState])

  const awardDeepWork = useCallback((minutes: number) => {
    setState(prev => {
      const newState = { ...prev, deepWorkMinutes: prev.deepWorkMinutes + minutes }
      persistState(newState)
      return newState
    })
    const sessions = Math.floor(minutes / 25)
    if (sessions > 0) {
      addXP(sessions * GAMIFICATION_CONFIG.XP_RULES.deep_work_25min, 'deep_work')
    }
  }, [addXP, persistState])

  const awardInsight = useCallback(() => {
    setState(prev => {
      const newState = { ...prev, insightsLogged: prev.insightsLogged + 1 }
      persistState(newState)
      return newState
    })
    addXP(GAMIFICATION_CONFIG.XP_RULES.insight_added, 'insight')
  }, [addXP, persistState])

  const awardNetworking = useCallback(() => {
    addXP(GAMIFICATION_CONFIG.XP_RULES.networking, 'networking')
  }, [addXP])

  const setWeekScore = useCallback((score: number) => {
    setState(prev => {
      const newState = { ...prev, weekScore: score }

      // Check for week champion achievement
      const newAchievements = checkAndUnlockAchievements(newState)
      if (newAchievements.length > 0) {
        newState.achievements = [...prev.achievements, ...newAchievements]
      }

      persistState(newState)
      return newState
    })
  }, [persistState, checkAndUnlockAchievements])

  const resetXP = useCallback(() => {
    const newState = createDefaultState()
    setState(newState)
    persistState(newState)
  }, [persistState])

  return {
    // State
    level: state.level,
    xpTotal: state.xpTotal,
    xpCurrentLevel: state.xpCurrentLevel,
    xpToNextLevel,
    xpProgress,
    levelTitle,
    streakDays: state.streakDays,
    achievements: state.achievements,
    weekScore: state.weekScore,
    deepWorkMinutes: state.deepWorkMinutes,
    opportunitiesCompleted: state.opportunitiesCompleted,

    // Actions
    addXP,
    awardCapture,
    awardTaskComplete,
    awardDeepWork,
    awardInsight,
    awardNetworking,
    setWeekScore,
    resetXP,
  }
}
