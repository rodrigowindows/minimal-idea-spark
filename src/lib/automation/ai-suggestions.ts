/**
 * AI-powered automation suggestions based on user behavior patterns.
 */

import type { Trigger } from './triggers'
import type { Action } from './actions'

export interface SuggestedAutomation {
  name: string
  description: string
  reason: string
  confidence: number
  trigger: Trigger
  actions: Action[]
}

function analyzeUserBehavior(): {
  hasHabits: boolean
  hasJournals: boolean
  hasGoals: boolean
  hasTasks: boolean
  completedTasks: number
  journalCount: number
} {
  try {
    const opps = JSON.parse(localStorage.getItem('lifeos_opportunities') || '[]')
    const logs = JSON.parse(localStorage.getItem('lifeos_daily_logs') || '[]')
    const habits = JSON.parse(localStorage.getItem('lifeos_habits') || '[]')
    const goals = JSON.parse(localStorage.getItem('lifeos_goals') || '[]')

    return {
      hasHabits: habits.length > 0,
      hasJournals: logs.length > 0,
      hasGoals: goals.length > 0,
      hasTasks: opps.length > 0,
      completedTasks: opps.filter((o: { status: string }) => o.status === 'done').length,
      journalCount: logs.length,
    }
  } catch {
    return { hasHabits: false, hasJournals: false, hasGoals: false, hasTasks: false, completedTasks: 0, journalCount: 0 }
  }
}

export function suggestAutomations(): SuggestedAutomation[] {
  const behavior = analyzeUserBehavior()
  const suggestions: SuggestedAutomation[] = []

  if (behavior.hasTasks && behavior.completedTasks >= 2) {
    suggestions.push({
      name: 'Reward XP on task completion',
      description: 'Automatically add XP when you complete a task.',
      trigger: { kind: 'event', event: 'task_completed' },
      actions: [
        { kind: 'add_xp', amount: 25, reason: 'Task completed (automation)' },
        { kind: 'send_notification', title: 'Great job!', body: 'You earned 25 XP for completing a task.' },
      ],
      confidence: 0.9,
      reason: `You've completed ${behavior.completedTasks} tasks — automating XP rewards keeps motivation high.`,
    })
  }

  if (behavior.hasHabits) {
    suggestions.push({
      name: 'Notify on habit streak milestone',
      description: 'Get notified when you hit a streak milestone.',
      trigger: { kind: 'event', event: 'streak_milestone' },
      actions: [
        { kind: 'send_notification', title: 'Streak milestone!', body: 'Your consistency is paying off.' },
        { kind: 'add_xp', amount: 50, reason: 'Streak milestone bonus' },
      ],
      confidence: 0.85,
      reason: 'You have active habits — streak notifications boost consistency.',
    })
  }

  if (behavior.hasJournals && behavior.journalCount >= 3) {
    suggestions.push({
      name: 'Daily journal reminder',
      description: 'A daily reminder to journal before bed.',
      trigger: { kind: 'schedule', cron: '0 21 * * *' },
      actions: [
        { kind: 'send_notification', title: 'Journal time', body: 'Take a few minutes to reflect on your day.' },
      ],
      confidence: 0.8,
      reason: `You've written ${behavior.journalCount} entries — a daily prompt maintains the habit.`,
    })
  }

  if (behavior.hasGoals) {
    suggestions.push({
      name: 'Weekly goal progress check',
      description: 'Weekly reminder to review goal progress.',
      trigger: { kind: 'schedule', cron: '0 10 * * 0' },
      actions: [
        { kind: 'send_notification', title: 'Weekly goal review', body: 'Check your goal progress and adjust milestones.' },
        { kind: 'log', message: 'Weekly goal check triggered' },
      ],
      confidence: 0.75,
      reason: 'You have active goals — weekly check-ins improve completion rates.',
    })
  }

  if (behavior.hasTasks) {
    suggestions.push({
      name: 'Morning priorities briefing',
      description: 'Start your day reviewing your priorities.',
      trigger: { kind: 'schedule', cron: '0 8 * * 1-5' },
      actions: [
        { kind: 'send_notification', title: 'Good morning!', body: 'Review your top priorities for today.' },
      ],
      confidence: 0.7,
      reason: 'A morning briefing helps focus on what matters.',
    })
  }

  suggestions.push({
    name: 'Auto-create task from capture',
    description: 'Convert quick captures into actionable tasks.',
    trigger: { kind: 'event', event: 'capture_saved' },
    actions: [
      { kind: 'create_task', title: 'From quick capture', priority: 5 },
      { kind: 'send_notification', title: 'Captured!', body: 'A new task was created from your capture.' },
    ],
    confidence: 0.65,
    reason: 'Quick captures often become tasks — automating this saves time.',
  })

  suggestions.push({
    name: 'Reward focus sessions',
    description: 'Earn XP when finishing deep work sessions.',
    trigger: { kind: 'event', event: 'focus_session_completed' },
    actions: [
      { kind: 'add_xp', amount: 30, reason: 'Focus session completed' },
      { kind: 'send_notification', title: 'Focus complete!', body: 'You earned 30 XP for deep work.' },
    ],
    confidence: 0.8,
    reason: 'Rewarding focus sessions reinforces deep work habits.',
  })

  return suggestions.sort((a, b) => b.confidence - a.confidence)
}
