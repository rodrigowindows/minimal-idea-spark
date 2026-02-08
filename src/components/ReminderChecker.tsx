import { useEffect, useRef } from 'react'
import { useLocalData } from '@/hooks/useLocalData'
import { checkReminders } from '@/lib/notifications/reminders'
import { toast } from 'sonner'

const REMINDERS_ENABLED_KEY = 'lifeos_reminders_enabled'

function getRemindersEnabled(): boolean {
  try {
    return localStorage.getItem(REMINDERS_ENABLED_KEY) !== 'false'
  } catch {
    return true
  }
}

export function ReminderChecker() {
  const { opportunities } = useLocalData()
  const ranRef = useRef(false)

  useEffect(() => {
    if (!getRemindersEnabled() || !opportunities?.length) return
    checkReminders(opportunities, (opp, message) => {
      toast(message, { description: opp.title })
    })
    ranRef.current = true
  }, [opportunities])

  useEffect(() => {
    const onFocus = () => {
      if (!getRemindersEnabled() || !opportunities?.length) return
      checkReminders(opportunities, (opp, message) => {
        toast(message, { description: opp.title })
      })
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [opportunities])

  return null
}
