/**
 * Parse Notion HTML exports into ImportedItem[].
 * Notion exports pages as HTML files with structured content.
 */

import type { ImportedItem } from './types'

let notionCounter = 0

function nextId(): string {
  return `imp-notion-${Date.now()}-${++notionCounter}`
}

/**
 * Parse a Notion HTML export string into ImportedItem[].
 * Notion HTML exports have a structure like:
 * <article><header><h1>Page Title</h1></header><div class="page-body">...</div></article>
 */
export function parseNotionHtml(html: string, sourceFile?: string): ImportedItem[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const items: ImportedItem[] = []

  // Try to find the main title
  const pageTitle =
    doc.querySelector('header h1')?.textContent?.trim() ||
    doc.querySelector('h1')?.textContent?.trim() ||
    doc.title?.trim() ||
    sourceFile?.replace(/\.html?$/i, '') ||
    'Untitled'

  // Strategy 1: If there are multiple h1/h2/h3 headings, each becomes an item
  const headings = doc.querySelectorAll('h1, h2, h3')

  if (headings.length > 1) {
    headings.forEach((heading) => {
      const title = heading.textContent?.trim()
      if (!title) return

      // Collect content until next heading
      const contentParts: string[] = []
      let sibling = heading.nextElementSibling
      while (sibling && !['H1', 'H2', 'H3'].includes(sibling.tagName)) {
        const text = extractTextContent(sibling)
        if (text) contentParts.push(text)
        sibling = sibling.nextElementSibling
      }

      items.push({
        id: nextId(),
        source: 'notion-html',
        targetType: 'opportunity',
        title,
        content: contentParts.join('\n\n'),
        sourceFile,
        tags: extractNotionTags(heading),
      })
    })
  } else {
    // Strategy 2: Single page = single item with all body content
    const body = doc.querySelector('.page-body') || doc.body
    const content = extractTextContent(body)

    items.push({
      id: nextId(),
      source: 'notion-html',
      targetType: 'opportunity',
      title: pageTitle,
      content,
      sourceFile,
    })
  }

  return items
}

/**
 * Parse multiple Notion HTML files (from a zip or folder upload).
 */
export function parseNotionHtmlFiles(
  files: { name: string; content: string }[]
): ImportedItem[] {
  const items: ImportedItem[] = []
  for (const file of files) {
    if (!file.name.toLowerCase().endsWith('.html') && !file.name.toLowerCase().endsWith('.htm')) {
      continue
    }
    const parsed = parseNotionHtml(file.content, file.name)
    items.push(...parsed)
  }
  return items
}

/** Extract readable text from an HTML element, converting to plain text / markdown-like format */
function extractTextContent(element: Element): string {
  const parts: string[] = []

  element.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim()
      if (text) parts.push(text)
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element
      const tag = el.tagName

      if (tag === 'P') {
        const text = el.textContent?.trim()
        if (text) parts.push(text)
      } else if (tag === 'UL' || tag === 'OL') {
        el.querySelectorAll('li').forEach((li) => {
          const text = li.textContent?.trim()
          if (text) parts.push(`- ${text}`)
        })
      } else if (tag === 'BLOCKQUOTE') {
        const text = el.textContent?.trim()
        if (text) parts.push(`> ${text}`)
      } else if (tag === 'PRE' || tag === 'CODE') {
        const text = el.textContent?.trim()
        if (text) parts.push(`\`\`\`\n${text}\n\`\`\``)
      } else if (tag === 'TABLE') {
        const rows = el.querySelectorAll('tr')
        rows.forEach((row) => {
          const cells = row.querySelectorAll('td, th')
          const rowText = Array.from(cells)
            .map((c) => c.textContent?.trim() || '')
            .join(' | ')
          if (rowText) parts.push(rowText)
        })
      } else if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(tag)) {
        // Skip headings in content extraction (they are item separators)
      } else {
        const text = el.textContent?.trim()
        if (text) parts.push(text)
      }
    }
  })

  return parts.join('\n\n')
}

/** Extract tags from Notion elements (looks for tag-like spans or properties) */
function extractNotionTags(element: Element): string[] {
  const tags: string[] = []
  const parent = element.parentElement
  if (!parent) return tags

  // Look for Notion multi-select property values near the heading
  parent.querySelectorAll('.multi_select .selected-value, .property-value span').forEach((el) => {
    const text = el.textContent?.trim()
    if (text) tags.push(text)
  })

  return tags
}
