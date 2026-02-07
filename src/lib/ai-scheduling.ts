import type { CalendarEvent, Opportunity, TimeBlock } from '@/types'
import { parseISO, format, addMinutes, setHours, setMinutes, isBefore, isAfter } from 'date-fns'

interface TimeSlot {
  start: Date
  end: Date
  score: number
  reason: string
}

interface ScheduleSuggestion {
  opportunity: Opportunity
  suggestedSlot: TimeSlot
}

// Peak productivity windows (based on common chronotype patterns)
const PRODUCTIVITY_PEAKS = [
  { start: 9, end: 11, weight: 1.0, label: 'Morning peak' },
  { start: 14, end: 16, weight: 0.7, label: 'Afternoon focus' },
  { start: 20, end: 22, weight: 0.5, label: 'Evening session' },
]

const TYPE_PREFERRED_HOURS: Record<string, { start: number; end: number }> = {
  study: { start: 8, end: 12 },
  action: { start: 9, end: 17 },
  networking: { start: 10, end: 18 },
  insight: { start: 14, end: 22 },
}

function getProductivityScore(hour: number): number {
  for (const peak of PRODUCTIVITY_PEAKS) {
    if (hour >= peak.start && hour < peak.end) {
      return peak.weight
    }
  }
  return 0.3
}

function getTypePreferenceScore(type: string, hour: number): number {
  const pref = TYPE_PREFERRED_HOURS[type]
  if (!pref) return 0.5
  if (hour >= pref.start && hour < pref.end) return 1.0
  return 0.2
}

// Find free slots in a given day, avoiding existing events
function findFreeSlots(
  date: Date,
  existingEvents: CalendarEvent[],
  existingBlocks: TimeBlock[],
  durationMinutes: number = 60,
  workdayStart: number = 7,
  workdayEnd: number = 22,
): TimeSlot[] {
  const dayStr = format(date, 'yyyy-MM-dd')

  // Build occupied intervals
  const occupied: { start: number; end: number }[] = []

  for (const event of existingEvents) {
    const eventStart = parseISO(event.start)
    const eventEnd = parseISO(event.end)
    if (format(eventStart, 'yyyy-MM-dd') === dayStr) {
      occupied.push({
        start: eventStart.getHours() * 60 + eventStart.getMinutes(),
        end: eventEnd.getHours() * 60 + eventEnd.getMinutes(),
      })
    }
  }

  for (const block of existingBlocks) {
    if (block.block_date === dayStr) {
      const [h, m] = block.block_start.split(':').map(Number)
      occupied.push({
        start: h * 60 + m,
        end: h * 60 + m + block.block_duration,
      })
    }
  }

  occupied.sort((a, b) => a.start - b.start)

  // Find gaps
  const slots: TimeSlot[] = []
  let cursor = workdayStart * 60

  for (const occ of occupied) {
    if (cursor + durationMinutes <= occ.start) {
      // There's a gap before this occupied block
      let slotStart = cursor
      while (slotStart + durationMinutes <= occ.start) {
        const startDate = setMinutes(setHours(new Date(date), Math.floor(slotStart / 60)), slotStart % 60)
        const endDate = addMinutes(startDate, durationMinutes)
        const hour = Math.floor(slotStart / 60)
        const score = getProductivityScore(hour)

        slots.push({
          start: startDate,
          end: endDate,
          score,
          reason: score >= 0.7 ? 'Peak productivity window' : 'Available slot',
        })
        slotStart += 30 // Check every 30 min
      }
    }
    cursor = Math.max(cursor, occ.end)
  }

  // Check remaining time after last occupied block
  let slotStart = cursor
  while (slotStart + durationMinutes <= workdayEnd * 60) {
    const startDate = setMinutes(setHours(new Date(date), Math.floor(slotStart / 60)), slotStart % 60)
    const endDate = addMinutes(startDate, durationMinutes)
    const hour = Math.floor(slotStart / 60)
    const score = getProductivityScore(hour)

    slots.push({
      start: startDate,
      end: endDate,
      score,
      reason: score >= 0.7 ? 'Peak productivity window' : 'Available slot',
    })
    slotStart += 30
  }

  return slots.sort((a, b) => b.score - a.score)
}

// Suggest the best time for an opportunity based on type, priority, and availability
export function suggestBestTime(
  opportunity: Opportunity,
  date: Date,
  existingEvents: CalendarEvent[],
  existingBlocks: TimeBlock[],
  durationMinutes: number = 60,
): TimeSlot | null {
  const freeSlots = findFreeSlots(date, existingEvents, existingBlocks, durationMinutes)

  if (freeSlots.length === 0) return null

  // Score each slot based on opportunity type preference
  const scoredSlots = freeSlots.map(slot => {
    const hour = slot.start.getHours()
    const typeScore = getTypePreferenceScore(opportunity.type, hour)
    const priorityBonus = (opportunity.priority / 10) * 0.3

    return {
      ...slot,
      score: slot.score * 0.4 + typeScore * 0.4 + priorityBonus * 0.2,
      reason: typeScore >= 0.8
        ? `Best time for ${opportunity.type} tasks`
        : slot.reason,
    }
  })

  scoredSlots.sort((a, b) => b.score - a.score)
  return scoredSlots[0]
}

// Auto-schedule multiple opportunities for a day based on priorities
export function autoScheduleDay(
  opportunities: Opportunity[],
  date: Date,
  existingEvents: CalendarEvent[],
  existingBlocks: TimeBlock[],
): ScheduleSuggestion[] {
  // Sort by priority (highest first) and strategic value
  const sorted = [...opportunities].sort((a, b) => {
    const aScore = a.priority * 2 + (a.strategic_value ?? 0)
    const bScore = b.priority * 2 + (b.strategic_value ?? 0)
    return bScore - aScore
  })

  const suggestions: ScheduleSuggestion[] = []
  const scheduledEvents = [...existingEvents]

  for (const opp of sorted) {
    const duration = opp.type === 'study' ? 90 : opp.type === 'action' ? 60 : 45
    const slot = suggestBestTime(opp, date, scheduledEvents, existingBlocks, duration)

    if (slot) {
      suggestions.push({ opportunity: opp, suggestedSlot: slot })
      // Add this as a "virtual" event to avoid double-booking
      scheduledEvents.push({
        id: `suggested-${opp.id}`,
        user_id: opp.user_id,
        title: opp.title,
        description: null,
        start: slot.start.toISOString(),
        end: slot.end.toISOString(),
        color: '#888',
        category: 'task',
        opportunity_id: opp.id,
        reminder_minutes: null,
        recurrence: null,
        created_at: new Date().toISOString(),
      })
    }
  }

  return suggestions
}

// Analyze productivity patterns (simple heuristic based on completed events)
export function analyzeProductivity(events: CalendarEvent[]) {
  const hourCounts: Record<number, number> = {}
  const categoryCounts: Record<string, number> = {}
  let totalMinutes = 0

  for (const event of events) {
    const start = parseISO(event.start)
    const end = parseISO(event.end)
    const hour = start.getHours()
    const minutes = (end.getTime() - start.getTime()) / (1000 * 60)

    hourCounts[hour] = (hourCounts[hour] || 0) + 1
    categoryCounts[event.category] = (categoryCounts[event.category] || 0) + 1
    totalMinutes += minutes
  }

  const peakHour = Object.entries(hourCounts)
    .sort(([, a], [, b]) => b - a)[0]

  const topCategory = Object.entries(categoryCounts)
    .sort(([, a], [, b]) => b - a)[0]

  return {
    totalEvents: events.length,
    totalHours: Math.round(totalMinutes / 60 * 10) / 10,
    peakHour: peakHour ? parseInt(peakHour[0]) : 9,
    topCategory: topCategory ? topCategory[0] : 'task',
    categoryCounts,
    hourDistribution: hourCounts,
  }
}
