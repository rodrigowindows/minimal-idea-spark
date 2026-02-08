/**
 * Parse Markdown content into opportunities or journal entries.
 * Headers (# Title) or list items can become items.
 */

export interface ParsedItem {
  type: 'opportunity' | 'journal'
  title: string
  content: string
  date?: string
}

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
