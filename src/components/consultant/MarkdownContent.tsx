import { useMemo } from 'react'

interface MarkdownContentProps {
  content: string
  className?: string
}

/** Lightweight inline-markdown renderer (bold, italic, code, links, lists, headers). */
export function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  const html = useMemo(() => renderMarkdown(content), [content])

  return (
    <div
      className={`prose prose-sm dark:prose-invert max-w-none break-words ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderMarkdown(md: string): string {
  const lines = md.split('\n')
  const result: string[] = []
  let inList = false
  let inOrderedList = false

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]

    // Close open lists if line doesn't continue
    if (inList && !/^\s*[-*]\s/.test(line)) {
      result.push('</ul>')
      inList = false
    }
    if (inOrderedList && !/^\s*\d+\.\s/.test(line)) {
      result.push('</ol>')
      inOrderedList = false
    }

    // Headers
    const headerMatch = line.match(/^(#{1,3})\s+(.*)/)
    if (headerMatch) {
      const level = headerMatch[1].length
      result.push(`<h${level + 1}>${inlineFormat(escapeHtml(headerMatch[2]))}</h${level + 1}>`)
      continue
    }

    // Unordered list items
    const ulMatch = line.match(/^\s*[-*]\s+(.*)/)
    if (ulMatch) {
      if (!inList) {
        result.push('<ul>')
        inList = true
      }
      result.push(`<li>${inlineFormat(escapeHtml(ulMatch[1]))}</li>`)
      continue
    }

    // Ordered list items
    const olMatch = line.match(/^\s*\d+\.\s+(.*)/)
    if (olMatch) {
      if (!inOrderedList) {
        result.push('<ol>')
        inOrderedList = true
      }
      result.push(`<li>${inlineFormat(escapeHtml(olMatch[1]))}</li>`)
      continue
    }

    // Empty line → paragraph break
    if (line.trim() === '') {
      result.push('<br/>')
      continue
    }

    // Normal paragraph
    result.push(`<p>${inlineFormat(escapeHtml(line))}</p>`)
  }

  if (inList) result.push('</ul>')
  if (inOrderedList) result.push('</ol>')

  return result.join('\n')
}

function inlineFormat(text: string): string {
  return text
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="rounded bg-muted px-1 py-0.5 text-xs">$1</code>')
    // Bold
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary underline">$1</a>')
}
