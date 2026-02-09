import { useState, useCallback } from 'react'

const KEYS = {
  welcomeDismissed: 'lifeos_welcome_dismissed',
  tourCompleted: 'lifeos_tour_completed',
  checklistDismissed: 'lifeos_checklist_dismissed',
  checklistItems: 'lifeos_checklist_items',
  demoMode: 'lifeos_demo_mode',
  contextualTipsSeen: 'lifeos_contextual_tips_seen',
} as const

function readBool(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1' || localStorage.getItem(key) === 'true'
  } catch {
    return false
  }
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export interface ChecklistState {
  createdOpportunity: boolean
  wroteJournal: boolean
  visitedConsultant: boolean
  triedDeepWork: boolean
}

const DEFAULT_CHECKLIST: ChecklistState = {
  createdOpportunity: false,
  wroteJournal: false,
  visitedConsultant: false,
  triedDeepWork: false,
}

export function useOnboarding() {
  const [welcomeDismissed, setWelcomeDismissed] = useState(() => readBool(KEYS.welcomeDismissed))
  const [tourCompleted, setTourCompleted] = useState(() => readBool(KEYS.tourCompleted))
  const [checklistDismissed, setChecklistDismissedState] = useState(() => readBool(KEYS.checklistDismissed))
  const [checklist, setChecklistState] = useState<ChecklistState>(() => readJson(KEYS.checklistItems, DEFAULT_CHECKLIST))
  const [demoMode, setDemoModeState] = useState(() => readBool(KEYS.demoMode))
  const [tipsSeen, setTipsSeenState] = useState<string[]>(() => readJson(KEYS.contextualTipsSeen, []))

  const dismissWelcome = useCallback(() => {
    localStorage.setItem(KEYS.welcomeDismissed, '1')
    setWelcomeDismissed(true)
  }, [])

  const completeTour = useCallback(() => {
    localStorage.setItem(KEYS.tourCompleted, 'true')
    setTourCompleted(true)
  }, [])

  const resetTour = useCallback(() => {
    localStorage.removeItem(KEYS.tourCompleted)
    localStorage.removeItem(KEYS.welcomeDismissed)
    setTourCompleted(false)
    setWelcomeDismissed(false)
  }, [])

  const updateChecklist = useCallback((key: keyof ChecklistState) => {
    setChecklistState((prev) => {
      const next = { ...prev, [key]: true }
      localStorage.setItem(KEYS.checklistItems, JSON.stringify(next))
      return next
    })
  }, [])

  const dismissChecklist = useCallback(() => {
    localStorage.setItem(KEYS.checklistDismissed, '1')
    setChecklistDismissedState(true)
  }, [])

  const toggleDemoMode = useCallback(() => {
    setDemoModeState((prev) => {
      const next = !prev
      localStorage.setItem(KEYS.demoMode, next ? '1' : '')
      return next
    })
  }, [])

  const markTipSeen = useCallback((tipId: string) => {
    setTipsSeenState((prev) => {
      if (prev.includes(tipId)) return prev
      const next = [...prev, tipId]
      localStorage.setItem(KEYS.contextualTipsSeen, JSON.stringify(next))
      return next
    })
  }, [])

  const isTipSeen = useCallback((tipId: string) => tipsSeen.includes(tipId), [tipsSeen])

  const checklistProgress = Object.values(checklist).filter(Boolean).length
  const checklistTotal = Object.keys(checklist).length
  const isChecklistComplete = checklistProgress === checklistTotal

  return {
    welcomeDismissed,
    tourCompleted,
    checklistDismissed,
    checklist,
    demoMode,
    checklistProgress,
    checklistTotal,
    isChecklistComplete,
    dismissWelcome,
    completeTour,
    resetTour,
    updateChecklist,
    dismissChecklist,
    toggleDemoMode,
    markTipSeen,
    isTipSeen,
  }
}
