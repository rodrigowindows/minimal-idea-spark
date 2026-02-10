/**
 * Parse Markdown content into importable items.
 * Supports standard Markdown, Notion CSV exports, and generic .md files.
 */

import type { ImportedItem, ImportSource } from './types'

export interface ParsedItem {
  type: 'opportunity' | 'journal'
  title: string
  content: string
  date?: string
}

let itemCounter = 0

function nextId(prefix: string): string {
  return `${prefix}-${Date.now()}-${++itemCounter}`
}

/**
 * Parse a single Markdown file into ImportedItem[].
 * Each # heading or top-level list item becomes a separate item.
 */
export function parseMarkdownFile(
  md: string,
  source: ImportSource = 'markdown',
  sourceFile?: string
): ImportedItem[] {
  const items: ImportedItem[] = []
  const lines = md.split(/\r?\n/)
  let current: { title: string; content: string[]; tags: string[] } | null = null

  const flush = () => {
    if (!current) return
    const content = current.content.join('\n').trim()
    const tags = extractTags(content)
    items.push({
      id: nextId('imp'),
      source,
      targetType: 'opportunity',
      title: current.title,
      content,
      tags: [...current.tags, ...tags],
      sourceFile,
    })
    current = null
  }

  for (const line of lines) {
    const headerMatch = line.match(/^(#{1,3})\s+(.+)$/)
    const listMatch = line.match(/^[-*]\s+(.+)$/)

    if (headerMatch) {
      flush()
      const title = headerMatch[2].trim()
      const inlineTags = extractInlineTags(title)
      current = { title: cleanTitle(title), content: [], tags: inlineTags }
    } else if (listMatch && listMatch[1].trim() && !current) {
      // Top-level list items only become items if there's no current heading context
      flush()
      current = { title: listMatch[1].trim(), content: [], tags: [] }
    } else if (current && line.trim()) {
      current.content.push(line)
    }
  }

  flush()
  return items
}

/**
 * Legacy function: parse markdown to simple ParsedItem[] (backward compat).
 */
export function parseMarkdownToItems(md: string): ParsedItem[] {
  const items: ParsedItem[] = []
  const lines = md.split(/\r?\n/)
  let current: { title: string; content: string[] } | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const headerMatch = line.match(/^(#{1,3})\s+(.+)$/)
    const listMatch = line.match(/^[-*]\s+(.+)$/)

    if (headerMatch) {
      if (current) {
        items.push({
          type: 'opportunity',
          title: current.title,
          content: current.content.join('\n').trim(),
        })
      }
      current = { title: headerMatch[2].trim(), content: [] }
    } else if (listMatch && listMatch[1].trim()) {
      if (current) {
        items.push({
          type: 'opportunity',
          title: current.title,
          content: current.content.join('\n').trim(),
        })
      }
      current = { title: listMatch[1].trim(), content: [] }
    } else if (current && line.trim()) {
      current.content.push(line)
    }
  }

  if (current) {
    items.push({
      type: 'opportunity',
      title: current.title,
      content: current.content.join('\n').trim(),
    })
  }

  return items
}

/**
 * Parse Notion CSV export into ImportedItem[].
 */
export function parseNotionCsv(csvText: string): ParsedItem[] {
  const lines = csvText.split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
  const titleIdx = headers.findIndex((h) => h === 'title' || h === 'name' || h === 'nome')
  const contentIdx = headers.findIndex((h) => h === 'content' || h === 'body' || h === 'conteúdo')
  if (titleIdx === -1) return []

  const items: ParsedItem[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i])
    const title = values[titleIdx]?.trim()
    if (!title) continue
    const content = contentIdx >= 0 ? (values[contentIdx] ?? '').trim() : ''
    items.push({ type: 'opportunity', title, content })
  }
  return items
}

/**
 * Parse Notion CSV into ImportedItem[] (enhanced version).
 */
export function parseNotionCsvToImportItems(csvText: string): ImportedItem[] {
  const lines = csvText.split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
  const titleIdx = headers.findIndex((h) =>
    ['title', 'name', 'nome', 'titulo', 'título'].includes(h)
  )
  const contentIdx = headers.findIndex((h) =>
    ['content', 'body', 'conteúdo', 'conteudo', 'description', 'descrição'].includes(h)
  )
  const dateIdx = headers.findIndex((h) =>
    ['date', 'data', 'created', 'created_at', 'created time'].includes(h)
  )
  const tagsIdx = headers.findIndex((h) =>
    ['tags', 'labels', 'category', 'categoria'].includes(h)
  )

  if (titleIdx === -1) return []

  const items: ImportedItem[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i])
    const title = values[titleIdx]?.trim()
    if (!title) continue

    const content = contentIdx >= 0 ? (values[contentIdx] ?? '').trim() : ''
    const date = dateIdx >= 0 ? (values[dateIdx] ?? '').trim() : undefined
    const tags = tagsIdx >= 0
      ? (values[tagsIdx] ?? '').split(/[,;]/).map(t => t.trim()).filter(Boolean)
      : []

    items.push({
      id: nextId('imp'),
      source: 'notion-csv',
      targetType: 'opportunity',
      title,
      content,
      date: date || undefined,
      tags,
    })
  }

  return items
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      inQuotes = !inQuotes
    } else if ((c === ',' && !inQuotes) || c === '\n') {
      result.push(current.replace(/""/g, '"'))
      current = ''
    } else {
      current += c
    }
  }
  result.push(current.replace(/""/g, '"'))
  return result
}

/** Extract #tags from content */
function extractTags(text: string): string[] {
  const matches = text.match(/#[\w-]+/g)
  return matches ? matches.map(t => t.slice(1)) : []
}

/** Extract inline tags from title like "Title #tag1 #tag2" */
function extractInlineTags(title: string): string[] {
  const matches = title.match(/#[\w-]+/g)
  return matches ? matches.map(t => t.slice(1)) : []
}

/** Remove inline tags from title */
function cleanTitle(title: string): string {
  return title.replace(/#[\w-]+/g, '').trim()
}
