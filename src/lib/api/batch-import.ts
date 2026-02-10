/**
 * Batch import utilities: create opportunities from CSV/JSON via the API.
 * Used both from the Integrations page UI and the inbound webhook edge function.
 */

export interface ImportItem {
  title: string
  description?: string
  status?: 'backlog' | 'doing' | 'review' | 'done'
  domain_id?: string
  tags?: string[]
}

export interface ImportResult {
  total: number
  success: number
  failed: number
  errors: string[]
}

/** Parse CSV text into ImportItem[] */
export function parseCsvImport(csv: string): ImportItem[] {
  const lines = csv.trim().split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''))
  const titleIdx = headers.indexOf('title')
  if (titleIdx === -1) return []

  const descIdx = headers.indexOf('description')
  const statusIdx = headers.indexOf('status')
  const domainIdx = headers.indexOf('domain_id')
  const tagsIdx = headers.indexOf('tags')

  return lines.slice(1).map((line) => {
    const cols = parseCsvLine(line)
    const item: ImportItem = { title: cols[titleIdx]?.trim() || '' }
    if (descIdx >= 0 && cols[descIdx]) item.description = cols[descIdx].trim()
    if (statusIdx >= 0 && cols[statusIdx]) {
      const s = cols[statusIdx].trim().toLowerCase()
      if (['backlog', 'doing', 'review', 'done'].includes(s)) {
        item.status = s as ImportItem['status']
      }
    }
    if (domainIdx >= 0 && cols[domainIdx]) item.domain_id = cols[domainIdx].trim()
    if (tagsIdx >= 0 && cols[tagsIdx]) {
      item.tags = cols[tagsIdx].split(';').map((t) => t.trim()).filter(Boolean)
    }
    return item
  }).filter((i) => i.title)
}

/** Parse JSON text into ImportItem[] */
export function parseJsonImport(json: string): ImportItem[] {
  try {
    const parsed = JSON.parse(json)
    const arr = Array.isArray(parsed) ? parsed : parsed.items ?? parsed.opportunities ?? [parsed]
    return arr
      .map((item: Record<string, unknown>) => ({
        title: String(item.title ?? ''),
        description: item.description ? String(item.description) : undefined,
        status: item.status as ImportItem['status'],
        domain_id: item.domain_id ? String(item.domain_id) : undefined,
        tags: Array.isArray(item.tags) ? item.tags.map(String) : undefined,
      }))
      .filter((i: ImportItem) => i.title)
  } catch {
    return []
  }
}

/** Simple CSV line parser that handles quoted fields */
function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}
