/**
 * Syncs opportunity deadlines to calendar events.
 * Creates/updates calendar events when opportunities have due_date set.
 */

const STORAGE_KEY = 'lifeos_calendar_events'
const SYNC_MAP_KEY = 'lifeos_deadline_calendar_map'

interface CalendarEventData {
  id: string
  user_id: string
  title: string
  description: string | null
  start: string
  end: string
  color: string
  category: 'task' | 'meeting' | 'focus' | 'personal' | 'reminder'
  opportunity_id: string | null
  reminder_minutes: number | null
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly' | null
  created_at: string
}

function loadEvents(): CalendarEventData[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  return []
}

function saveEvents(events: CalendarEventData[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events))
}

function getSyncMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(SYNC_MAP_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return {}
}

function saveSyncMap(map: Record<string, string>) {
  localStorage.setItem(SYNC_MAP_KEY, JSON.stringify(map))
}

export function syncOpportunityDeadlineToCalendar(opportunity: {
  id: string
  title: string
  description?: string | null
  due_date?: string | null
  domain_color?: string
}) {
  if (!opportunity.due_date) {
    // Remove calendar event if due_date was cleared
    removeDeadlineEvent(opportunity.id)
    return
  }

  const events = loadEvents()
  const syncMap = getSyncMap()
  const existingEventId = syncMap[opportunity.id]

  const dueDate = opportunity.due_date.slice(0, 10)
  const startTime = `${dueDate}T09:00:00.000Z`
  const endTime = `${dueDate}T10:00:00.000Z`

  if (existingEventId) {
    // Update existing calendar event
    const idx = events.findIndex(e => e.id === existingEventId)
    if (idx >= 0) {
      events[idx] = {
        ...events[idx],
        title: `📅 ${opportunity.title}`,
        description: opportunity.description ?? null,
        start: startTime,
        end: endTime,
        color: opportunity.domain_color ?? '#ef4444',
      }
      saveEvents(events)
      return
    }
  }

  // Create new calendar event
  const newEvent: CalendarEventData = {
    id: `cal-deadline-${opportunity.id}-${Date.now()}`,
    user_id: 'mock-user-001',
    title: `📅 ${opportunity.title}`,
    description: opportunity.description ?? null,
    start: startTime,
    end: endTime,
    color: opportunity.domain_color ?? '#ef4444',
    category: 'reminder',
    opportunity_id: opportunity.id,
    reminder_minutes: 60,
    recurrence: null,
    created_at: new Date().toISOString(),
  }

  events.push(newEvent)
  saveEvents(events)

  syncMap[opportunity.id] = newEvent.id
  saveSyncMap(syncMap)
}

export function removeDeadlineEvent(opportunityId: string) {
  const syncMap = getSyncMap()
  const eventId = syncMap[opportunityId]
  if (!eventId) return

  const events = loadEvents().filter(e => e.id !== eventId)
  saveEvents(events)

  delete syncMap[opportunityId]
  saveSyncMap(syncMap)
}
