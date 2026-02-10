import { useEffect, useRef } from 'react'
import { useLocalData } from '@/hooks/useLocalData'
import { checkReminders } from '@/lib/notifications/reminders'
import { notifyTaskDue } from '@/lib/notifications/contextual-generator'
import { toast } from 'sonner'

const REMINDERS_ENABLED_KEY = 'lifeos_reminders_enabled'
const JOURNAL_REMINDER_KEY = 'lifeos_journal_reminder_enabled'
const JOURNAL_REMINDER_SHOWN_KEY = 'lifeos_journal_reminder_shown_date'
const CHECK_INTERVAL_MS = 60_000 // Check every 60 seconds

function getRemindersEnabled(): boolean {
  try {
    return localStorage.getItem(REMINDERS_ENABLED_KEY) !== 'false'
  } catch {
    return true
  }
}

function getJournalReminderEnabled(): boolean {
  try {
    return localStorage.getItem(JOURNAL_REMINDER_KEY) !== 'false'
  } catch {
    return true
  }
}

function runCheck(opportunities: any[]) {
  if (!getRemindersEnabled() || !opportunities?.length) return

  checkReminders(opportunities, (opp, message) => {
    toast(message, { description: opp.title })
    // Also push to notification center
    notifyTaskDue(opp.title, opp.due_date?.slice(0, 10) ?? '', `/opportunities/${opp.id}`)
  })

  // Check for opportunities due within advance reminder window
  const advanceDays = getAdvanceReminderDays()
  if (advanceDays > 0) {
    const now = new Date()
    const futureDate = new Date(now)
    futureDate.setDate(futureDate.getDate() + advanceDays)
    const futureDateStr = futureDate.toISOString().slice(0, 10)
    const todayStr = now.toISOString().slice(0, 10)

    for (const opp of opportunities) {
      if (!opp.due_date || opp.status === 'done') continue
      const due = opp.due_date.slice(0, 10)
      if (due > todayStr && due <= futureDateStr) {
        const daysUntil = Math.ceil((new Date(due).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        notifyTaskDue(
          opp.title,
          `in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`,
          `/opportunities/${opp.id}`
        )
      }
    }
  }
}

function getAdvanceReminderDays(): number {
  try {
    const val = localStorage.getItem('lifeos_reminder_advance_days')
    return val ? parseInt(val, 10) : 1
  } catch {
    return 1
  }
}

function checkJournalReminder(dailyLogs: any[]) {
  if (!getRemindersEnabled() || !getJournalReminderEnabled()) return

  const today = new Date().toISOString().slice(0, 10)
  const shownDate = localStorage.getItem(JOURNAL_REMINDER_SHOWN_KEY)
  if (shownDate === today) return // Already reminded today

  const hour = new Date().getHours()
  if (hour < 8 || hour > 22) return // Only remind during reasonable hours

  const hasEntryToday = dailyLogs?.some(
    (log) => log.log_date?.slice(0, 10) === today
  )
  if (hasEntryToday) return // Already wrote today

  localStorage.setItem(JOURNAL_REMINDER_SHOWN_KEY, today)
  toast('Daily Journal Reminder', {
    description: "You haven't written in your journal today. Take a moment to reflect!",
    action: {
      label: 'Write now',
      onClick: () => {
        window.location.hash = ''
        window.location.pathname = '/journal'
      },
    },
  })
}

export function ReminderChecker() {
  const { opportunities, dailyLogs } = useLocalData()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Run on mount and when opportunities change
  useEffect(() => {
    if (!opportunities?.length) return
    runCheck(opportunities)
  }, [opportunities])

  // Run journal reminder check
  useEffect(() => {
    if (!dailyLogs) return
    checkJournalReminder(dailyLogs)
  }, [dailyLogs])

  // Periodic interval check
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (opportunities?.length) {
        runCheck(opportunities)
      }
      if (dailyLogs) {
        checkJournalReminder(dailyLogs)
      }
    }, CHECK_INTERVAL_MS)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [opportunities, dailyLogs])

  // Window focus check
  useEffect(() => {
    const onFocus = () => {
      if (opportunities?.length) runCheck(opportunities)
      if (dailyLogs) checkJournalReminder(dailyLogs)
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [opportunities, dailyLogs])

  return null
}
