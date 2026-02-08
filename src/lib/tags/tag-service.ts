/**
 * Tag CRUD and opportunity/journal associations.
 * Data stored in localStorage (lifeos_tags, lifeos_opportunity_tags, lifeos_journal_tags).
 */

const STORAGE_TAGS = 'lifeos_tags'
const STORAGE_OPP_TAGS = 'lifeos_opportunity_tags'
const STORAGE_JOURNAL_TAGS = 'lifeos_journal_tags'

export interface Tag {
  id: string
  name: string
  color: string
  created_at: string
}

function loadTags(): Tag[] {
  try {
    const raw = localStorage.getItem(STORAGE_TAGS)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return []
}

function saveTags(tags: Tag[]) {
  localStorage.setItem(STORAGE_TAGS, JSON.stringify(tags))
}

function loadOppTags(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(STORAGE_OPP_TAGS)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return {}
}

function saveOppTags(map: Record<string, string[]>) {
  localStorage.setItem(STORAGE_OPP_TAGS, JSON.stringify(map))
}

function loadJournalTags(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(STORAGE_JOURNAL_TAGS)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return {}
}

function saveJournalTags(map: Record<string, string[]>) {
  localStorage.setItem(STORAGE_JOURNAL_TAGS, JSON.stringify(map))
}

const DEFAULT_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4']

export function getAllTags(): Tag[] {
  return loadTags()
}

export function createTag(name: string, color?: string): Tag {
  const tags = loadTags()
  const id = `tag-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const tag: Tag = {
    id,
    name: name.trim(),
    color: color ?? DEFAULT_COLORS[tags.length % DEFAULT_COLORS.length],
    created_at: new Date().toISOString(),
  }
  tags.push(tag)
  saveTags(tags)
  return tag
}

export function updateTag(id: string, data: Partial<Pick<Tag, 'name' | 'color'>>): Tag | null {
  const tags = loadTags()
  const idx = tags.findIndex((t) => t.id === id)
  if (idx === -1) return null
  if (data.name !== undefined) tags[idx].name = data.name.trim()
  if (data.color !== undefined) tags[idx].color = data.color
  saveTags(tags)
  return tags[idx]
}

export function deleteTag(id: string): boolean {
  const tags = loadTags().filter((t) => t.id !== id)
  if (tags.length === loadTags().length) return false
  saveTags(tags)
  const oppMap = loadOppTags()
  for (const key of Object.keys(oppMap)) {
    oppMap[key] = oppMap[key].filter((t) => t !== id)
  }
  saveOppTags(oppMap)
  const journalMap = loadJournalTags()
  for (const key of Object.keys(journalMap)) {
    journalMap[key] = journalMap[key].filter((t) => t !== id)
  }
  saveJournalTags(journalMap)
  return true
}

export function getTagsForOpportunity(opportunityId: string): string[] {
  return loadOppTags()[opportunityId] ?? []
}

export function setTagsForOpportunity(opportunityId: string, tagIds: string[]) {
  const map = loadOppTags()
  map[opportunityId] = tagIds
  saveOppTags(map)
}

export function getTagsForJournalEntry(logId: string): string[] {
  return loadJournalTags()[logId] ?? []
}

export function setTagsForJournalEntry(logId: string, tagIds: string[]) {
  const map = loadJournalTags()
  map[logId] = tagIds
  saveJournalTags(map)
}

export function getOpportunityIdsByTag(tagId: string): string[] {
  const map = loadOppTags()
  return Object.entries(map).filter(([, ids]) => ids.includes(tagId)).map(([id]) => id)
}

export function getTagCounts(): Record<string, number> {
  const map = loadOppTags()
  const counts: Record<string, number> = {}
  for (const ids of Object.values(map)) {
    for (const id of ids) {
      counts[id] = (counts[id] ?? 0) + 1
    }
  }
  return counts
}
