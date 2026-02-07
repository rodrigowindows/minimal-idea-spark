/**
 * Manage generated images in localStorage with search, tags, favorites, and categories.
 */

import type { GeneratedImage } from '@/lib/ai/image-generation'

// Re-export for convenience
export type StoredImage = GeneratedImage

const STORAGE_KEY = 'lifeos_generated_images'

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export function getStoredImages(): StoredImage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const list: StoredImage[] = raw ? JSON.parse(raw) : []
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  } catch {
    return []
  }
}

function saveImages(images: StoredImage[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(images.slice(0, 200)))
}

export function addStoredImage(img: StoredImage): void {
  const list = getStoredImages()
  list.unshift(img)
  saveImages(list)
}

export function removeStoredImage(id: string): void {
  const list = getStoredImages().filter((i) => i.id !== id)
  saveImages(list)
}

export function updateStoredImage(id: string, updates: Partial<StoredImage>): void {
  const list = getStoredImages().map((img) =>
    img.id === id ? { ...img, ...updates } : img,
  )
  saveImages(list)
}

export function clearAllImages(): void {
  localStorage.removeItem(STORAGE_KEY)
}

// ---------------------------------------------------------------------------
// Favorites
// ---------------------------------------------------------------------------

export function toggleFavorite(id: string): void {
  const list = getStoredImages().map((img) =>
    img.id === id ? { ...img, favorite: !img.favorite } : img,
  )
  saveImages(list)
}

export function getFavorites(): StoredImage[] {
  return getStoredImages().filter((img) => img.favorite)
}

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

export function addTag(id: string, tag: string): void {
  const list = getStoredImages().map((img) => {
    if (img.id !== id) return img
    const tags = img.tags ?? []
    if (tags.includes(tag)) return img
    return { ...img, tags: [...tags, tag] }
  })
  saveImages(list)
}

export function removeTag(id: string, tag: string): void {
  const list = getStoredImages().map((img) => {
    if (img.id !== id) return img
    return { ...img, tags: (img.tags ?? []).filter((t) => t !== tag) }
  })
  saveImages(list)
}

export function getAllTags(): string[] {
  const images = getStoredImages()
  const tagSet = new Set<string>()
  images.forEach((img) => (img.tags ?? []).forEach((t) => tagSet.add(t)))
  return Array.from(tagSet).sort()
}

// ---------------------------------------------------------------------------
// Search & Filter
// ---------------------------------------------------------------------------

export type ImageFilter = {
  query?: string
  tags?: string[]
  favorites?: boolean
  model?: string
  style?: string
}

export function filterImages(filter: ImageFilter): StoredImage[] {
  let images = getStoredImages()

  if (filter.favorites) {
    images = images.filter((img) => img.favorite)
  }

  if (filter.model) {
    images = images.filter((img) => img.model === filter.model)
  }

  if (filter.style) {
    images = images.filter((img) => img.style === filter.style)
  }

  if (filter.tags && filter.tags.length > 0) {
    images = images.filter((img) =>
      filter.tags!.every((t) => (img.tags ?? []).includes(t)),
    )
  }

  if (filter.query?.trim()) {
    const q = filter.query.trim().toLowerCase()
    images = images.filter(
      (img) =>
        img.prompt.toLowerCase().includes(q) ||
        (img.revisedPrompt ?? '').toLowerCase().includes(q) ||
        (img.tags ?? []).some((t) => t.toLowerCase().includes(q)),
    )
  }

  return images
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export function getImageStats() {
  const images = getStoredImages()
  return {
    total: images.length,
    favorites: images.filter((i) => i.favorite).length,
    tags: getAllTags().length,
    byModel: {
      'dall-e-2': images.filter((i) => i.model === 'dall-e-2').length,
      'dall-e-3': images.filter((i) => i.model === 'dall-e-3').length,
    },
    byStyle: {
      vivid: images.filter((i) => i.style === 'vivid').length,
      natural: images.filter((i) => i.style === 'natural').length,
    },
  }
}
