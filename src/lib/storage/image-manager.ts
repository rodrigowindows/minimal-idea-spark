/**
 * Manage generated images (local storage + optional Supabase storage).
 */

export interface StoredImage {
  id: string
  url: string
  prompt: string
  createdAt: string
}

const STORAGE_KEY = 'minimal_idea_spark_generated_images'

export function getStoredImages(): StoredImage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const list: StoredImage[] = raw ? JSON.parse(raw) : []
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  } catch {
    return []
  }
}

export function addStoredImage(img: StoredImage): void {
  const list = getStoredImages()
  list.unshift(img)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 100)))
}

export function removeStoredImage(id: string): void {
  const list = getStoredImages().filter(i => i.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}
