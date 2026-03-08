import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
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
  const { user } = useAuth()
  const userId = user?.id
  const loadedForUser = useRef<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [state, setState] = useState<XPState>(createDefaultState)

  // Load from Supabase on login
  useEffect(() => {
    if (!userId) {
      setState(createDefaultState())
      loadedForUser.current = null
      return
    }
    if (loadedForUser.current === userId) return
    loadedForUser.current = userId

    async function load() {
      try {
        const { data, error } = await supabase
          .from('xp_summaries')
          .select('*')
          .eq('user_id', userId!)
          .maybeSingle()

        if (!error && data) {
          setState({
            level: data.level,
            xpTotal: data.xp_total,
            xpCurrentLevel: data.xp_current_level,
            streakDays: data.streak_days,
            achievements: (data.achievements as unknown as Achievement[]) ?? [],
            weekScore: data.week_score,
            deepWorkMinutes: data.deep_work_minutes,
            opportunitiesCompleted: data.opportunities_completed,
            insightsLogged: data.insights_logged,
            lastActivityDate: data.last_activity_date,
          })
        } else if (!error && !data) {
          // Create initial row
          await supabase.from('xp_summaries').insert({ user_id: userId! })
          // Also migrate from localStorage if exists
          const stored = localStorage.getItem('minimal_idea_spark_xp_state')
          if (stored) {
            try {
              const parsed = JSON.parse(stored) as XPState
              if (parsed.xpTotal > 0) {
                setState(parsed)
                await supabase.from('xp_summaries').update({
                  level: parsed.level,
                  xp_total: parsed.xpTotal,
                  xp_current_level: parsed.xpCurrentLevel,
                  streak_days: parsed.streakDays,
                  achievements: JSON.parse(JSON.stringify(parsed.achievements)),
                  week_score: parsed.weekScore,
                  deep_work_minutes: parsed.deepWorkMinutes,
                  opportunities_completed: parsed.opportunitiesCompleted,
                  insights_logged: parsed.insightsLogged,
                  last_activity_date: parsed.lastActivityDate,
                }).eq('user_id', userId!)
                localStorage.removeItem('minimal_idea_spark_xp_state')
              }
            } catch { /* ignore */ }
          }
        }
      } catch { /* ignore */ }
    }
    load()
  }, [userId])

  // Debounced save to Supabase
  const persistState = useCallback((newState: XPState) => {
    if (!userId) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      supabase.from('xp_summaries').update({
        level: newState.level,
        xp_total: newState.xpTotal,
        xp_current_level: newState.xpCurrentLevel,
        streak_days: newState.streakDays,
        achievements: newState.achievements as unknown as Record<string, unknown>[],
        week_score: newState.weekScore,
        deep_work_minutes: newState.deepWorkMinutes,
        opportunities_completed: newState.opportunitiesCompleted,
        insights_logged: newState.insightsLogged,
        last_activity_date: newState.lastActivityDate,
      }).eq('user_id', userId).then(({ error }) => {
        if (error) console.error('[persistXP]', error)
      })
    }, 500)
  }, [userId])

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

  const checkAndUnlockAchievements = useCallback((currentState: XPState): Achievement[] => {
    const newAchievements: Achievement[] = []
    const unlockedNames = new Set(currentState.achievements.map(a => a.name))

    for (const def of GAMIFICATION_CONFIG.ACHIEVEMENTS) {
      if (unlockedNames.has(def.name)) continue
      let shouldUnlock = false
      if ('unlock_at_xp' in def && currentState.xpTotal >= def.unlock_at_xp) shouldUnlock = true
      if ('unlock_at_streak' in def && currentState.streakDays >= def.unlock_at_streak) shouldUnlock = true
      if ('unlock_at_deep_work' in def && currentState.deepWorkMinutes >= def.unlock_at_deep_work) shouldUnlock = true
      if ('unlock_at_completed' in def && currentState.opportunitiesCompleted >= def.unlock_at_completed) shouldUnlock = true
      if ('unlock_at_insights' in def && currentState.insightsLogged >= def.unlock_at_insights) shouldUnlock = true
      if ('unlock_at_week_score' in def && currentState.weekScore && currentState.weekScore >= def.unlock_at_week_score) shouldUnlock = true

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

  const addXP = useCallback((amount: number, _reason?: string) => {
    setState(prev => {
      let newXpTotal = prev.xpTotal + amount
      let newXpCurrentLevel = prev.xpCurrentLevel + amount
      let newLevel = prev.level
      let leveledUp = false

      while (newXpCurrentLevel >= GAMIFICATION_CONFIG.XP_PER_LEVEL(newLevel)) {
        newXpCurrentLevel -= GAMIFICATION_CONFIG.XP_PER_LEVEL(newLevel)
        newLevel++
        leveledUp = true
      }

      const today = new Date().toISOString().split('T')[0]
      const lastDate = prev.lastActivityDate
      let newStreakDays = prev.streakDays

      if (lastDate !== today) {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]
        if (lastDate === yesterdayStr) {
          newStreakDays = prev.streakDays + 1
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

      const newAchievements = checkAndUnlockAchievements(newState)
      if (newAchievements.length > 0) {
        newState.achievements = [...prev.achievements, ...newAchievements]
        const achievementXP = newAchievements.reduce((sum, a) => sum + a.xp_reward, 0)
        newState.xpTotal += achievementXP
        newState.xpCurrentLevel += achievementXP
      }

      persistState(newState)

      setTimeout(() => {
        emitXPEvent({ type: 'xp_gained', amount })
        if (leveledUp) emitXPEvent({ type: 'level_up', level: newLevel })
        newAchievements.forEach(a => emitXPEvent({ type: 'achievement', achievement: a }))
      }, 0)

      return newState
    })
  }, [persistState, checkAndUnlockAchievements])

  const awardCapture = useCallback(() => addXP(GAMIFICATION_CONFIG.XP_RULES.capture, 'capture'), [addXP])

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
    if (sessions > 0) addXP(sessions * GAMIFICATION_CONFIG.XP_RULES.deep_work_25min, 'deep_work')
  }, [addXP, persistState])

  const awardInsight = useCallback(() => {
    setState(prev => {
      const newState = { ...prev, insightsLogged: prev.insightsLogged + 1 }
      persistState(newState)
      return newState
    })
    addXP(GAMIFICATION_CONFIG.XP_RULES.insight_added, 'insight')
  }, [addXP, persistState])

  const awardNetworking = useCallback(() => addXP(GAMIFICATION_CONFIG.XP_RULES.networking, 'networking'), [addXP])

  const setWeekScore = useCallback((score: number) => {
    setState(prev => {
      const newState = { ...prev, weekScore: score }
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
