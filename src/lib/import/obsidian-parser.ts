/**
 * Parse Obsidian vault exports (multiple .md files).
 * Preserves [[internal links]] as references between items.
 */

import type { ImportedItem } from './types'
import { parseMarkdownFile } from './markdown-parser'

let obsCounter = 0

function nextId(): string {
  return `imp-obs-${Date.now()}-${++obsCounter}`
}

/** Regex to match Obsidian [[wikilinks]] and [[wikilinks|alias]] */
const WIKILINK_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g

/**
 * Parse a single Obsidian .md file, preserving internal links.
 */
export function parseObsidianFile(
  md: string,
  fileName: string
): ImportedItem[] {
  // Extract internal links before parsing
  const internalLinks = extractInternalLinks(md)

  // Clean wikilinks from content for the parsed version
  const cleanedMd = md.replace(WIKILINK_REGEX, (_, target, alias) => alias || target)

  // Use markdown parser for basic structure
  const items = parseMarkdownFile(cleanedMd, 'obsidian', fileName)

  // If the file has no headings, treat the entire file as one item
  if (items.length === 0 && md.trim()) {
    const title = fileName.replace(/\.md$/i, '')
    items.push({
      id: nextId(),
      source: 'obsidian',
      targetType: 'opportunity',
      title,
      content: cleanedMd.trim(),
      sourceFile: fileName,
      internalLinks,
      tags: extractObsidianTags(md),
    })
  } else {
    // Add internal links and tags to all items from this file
    items.forEach((item) => {
      item.internalLinks = internalLinks
      item.tags = [...(item.tags || []), ...extractObsidianTags(md)]
    })
  }

  return items
}

/**
 * Parse multiple Obsidian vault files.
 * Resolves internal links between files.
 */
export function parseObsidianVault(
  files: { name: string; content: string }[]
): ImportedItem[] {
  const allItems: ImportedItem[] = []
  const mdFiles = files.filter((f) =>
    f.name.toLowerCase().endsWith('.md')
  )

  // Build a map of file names for link resolution
  const fileNameMap = new Set(
    mdFiles.map((f) => f.name.replace(/\.md$/i, '').toLowerCase())
  )

  for (const file of mdFiles) {
    // Skip hidden files and Obsidian config
    if (file.name.startsWith('.') || file.name.startsWith('_')) continue

    const items = parseObsidianFile(file.content, file.name)

    // Mark which internal links actually resolve to other files
    items.forEach((item) => {
      if (item.internalLinks) {
        item.internalLinks = item.internalLinks.filter((link) =>
          fileNameMap.has(link.toLowerCase())
        )
      }
    })

    allItems.push(...items)
  }

  return allItems
}

/** Extract [[wikilink]] targets from text */
function extractInternalLinks(text: string): string[] {
  const links: string[] = []
  let match: RegExpExecArray | null
  const regex = new RegExp(WIKILINK_REGEX.source, 'g')
  while ((match = regex.exec(text)) !== null) {
    const target = match[1].trim()
    if (target && !links.includes(target)) {
      links.push(target)
    }
  }
  return links
}

/** Extract Obsidian-style tags (#tag) and frontmatter tags */
function extractObsidianTags(md: string): string[] {
  const tags: string[] = []

  // Extract YAML frontmatter tags
  const frontmatterMatch = md.match(/^---\s*\n([\s\S]*?)\n---/)
  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1]
    const tagsMatch = frontmatter.match(/^tags:\s*(.+)$/m)
    if (tagsMatch) {
      // tags: [tag1, tag2] or tags: tag1, tag2
      const tagStr = tagsMatch[1].replace(/[\[\]]/g, '')
      tagStr.split(',').forEach((t) => {
        const clean = t.trim().replace(/^#/, '')
        if (clean) tags.push(clean)
      })
    }
    // Also handle YAML list format:
    // tags:
    //   - tag1
    //   - tag2
    const yamlListMatch = frontmatter.match(/^tags:\s*\n((?:\s+-\s+.+\n?)+)/m)
    if (yamlListMatch) {
      yamlListMatch[1].split('\n').forEach((line) => {
        const m = line.match(/^\s+-\s+(.+)/)
        if (m) {
          const clean = m[1].trim().replace(/^#/, '')
          if (clean) tags.push(clean)
        }
      })
    }
  }

  // Extract inline #tags (but not markdown headings)
  const bodyWithoutFrontmatter = md.replace(/^---\s*\n[\s\S]*?\n---/, '')
  const inlineMatches = bodyWithoutFrontmatter.match(/(?<=\s|^)#([\w-]+)/g)
  if (inlineMatches) {
    inlineMatches.forEach((t) => {
      const clean = t.slice(1)
      if (clean && !tags.includes(clean)) tags.push(clean)
    })
  }

  return tags
}
