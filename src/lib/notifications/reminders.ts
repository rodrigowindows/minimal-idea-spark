/**
 * Reminders: schedule and check due dates / reminder_at for opportunities.
 * Uses localStorage and setInterval to show in-app toasts; optional edge function for email.
 */
const STORAGE_REMINDERS = 'lifeos_reminders_shown'

function getShownIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_REMINDERS)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return []
}

function markShown(id: string) {
  const ids = getShownIds()
  if (!ids.includes(id)) {
    ids.push(id)
    localStorage.setItem(STORAGE_REMINDERS, JSON.stringify(ids.slice(-500)))
  }
}

export interface ReminderOpportunity {
  id: string
  title: string
  due_date?: string | null
  reminder_at?: string | null
}

export function checkReminders(
  opportunities: ReminderOpportunity[],
  onRemind: (opp: ReminderOpportunity, message: string) => void
) {
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const shown = getShownIds()

  for (const opp of opportunities) {
    if (!opp.due_date) continue
    const due = opp.due_date.slice(0, 10)
    const reminderAt = opp.reminder_at ? new Date(opp.reminder_at) : null
    const key = `rem-${opp.id}-${due}`

    if (shown.includes(key)) continue

    if (due < today) {
      onRemind(opp, `Overdue: ${opp.title}`)
      markShown(key)
    } else if (due === today) {
      onRemind(opp, `Due today: ${opp.title}`)
      markShown(key)
    } else if (reminderAt && reminderAt <= now) {
      onRemind(opp, `Reminder: ${opp.title}`)
      markShown(key)
    }
  }
}

export function clearShownReminders() {
  try {
    localStorage.removeItem(STORAGE_REMINDERS)
  } catch { /* ignore */ }
}
