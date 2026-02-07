/**
 * Simple priority score for notifications (higher = more important).
 */

import type { AppNotification } from './manager'

export function scorePriority(n: AppNotification): number {
  let s = n.priority ?? 0
  if (n.title.toLowerCase().includes('urgent')) s += 20
  if (n.title.toLowerCase().includes('reminder')) s += 10
  if (!n.read) s += 5
  return s
}

export function sortByPriority(list: AppNotification[]): AppNotification[] {
  return [...list].sort((a, b) => scorePriority(b) - scorePriority(a))
}

export function groupByKey(list: AppNotification[]): Map<string, AppNotification[]> {
  const map = new Map<string, AppNotification[]>()
  for (const n of list) {
    const key = n.groupKey ?? n.id
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(n)
  }
  return map
}
