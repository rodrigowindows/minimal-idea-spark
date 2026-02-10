/**
 * Detect duplicate items by comparing titles with existing opportunities.
 * Uses simple similarity scoring based on normalized string comparison.
 */

import type { ImportedItem } from './types'
import type { Opportunity } from '@/types'

const SIMILARITY_THRESHOLD = 0.8

/**
 * Normalize a string for comparison: lowercase, trim, remove punctuation.
 */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Simple trigram-based similarity score between two strings.
 * Returns a value between 0 and 1.
 */
function similarity(a: string, b: string): number {
  const na = normalize(a)
  const nb = normalize(b)
  if (na === nb) return 1
  if (!na || !nb) return 0

  const trigramsA = getTrigrams(na)
  const trigramsB = getTrigrams(nb)
  if (trigramsA.size === 0 && trigramsB.size === 0) return 1
  if (trigramsA.size === 0 || trigramsB.size === 0) return 0

  let intersection = 0
  trigramsA.forEach((v) => {
    if (trigramsB.has(v)) intersection++
  })

  return (2 * intersection) / (trigramsA.size + trigramsB.size)
}

function getTrigrams(str: string): Set<string> {
  const trigrams = new Set<string>()
  const padded = `  ${str} `
  for (let i = 0; i < padded.length - 2; i++) {
    trigrams.add(padded.substring(i, i + 3))
  }
  return trigrams
}

/**
 * Mark items that are potential duplicates of existing opportunities.
 * Mutates the items array in place.
 */
export function detectDuplicates(
  items: ImportedItem[],
  existingOpportunities: Opportunity[]
): ImportedItem[] {
  const existingTitles = existingOpportunities.map((opp) => ({
    title: opp.title,
    normalized: normalize(opp.title),
  }))

  return items.map((item) => {
    const normalizedTitle = normalize(item.title)

    for (const existing of existingTitles) {
      if (similarity(normalizedTitle, existing.normalized) >= SIMILARITY_THRESHOLD) {
        return {
          ...item,
          isDuplicate: true,
          duplicateOf: existing.title,
        }
      }
    }

    return item
  })
}
