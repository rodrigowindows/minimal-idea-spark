/**
 * Client helpers for AI image generation (DALL-E style API).
 */

export interface ImageGenerationOptions {
  prompt: string
  size?: '256x256' | '512x512' | '1024x1024'
  style?: 'vivid' | 'natural'
}

export interface GeneratedImage {
  id: string
  url: string
  prompt: string
  createdAt: string
}

export async function generateImage(options: ImageGenerationOptions): Promise<GeneratedImage | null> {
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL ?? ''}/functions/v1/generate-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.image ?? null
}

export const IMAGE_STYLES = [
  { value: 'vivid', label: 'Vivid' },
  { value: 'natural', label: 'Natural' },
] as const

export const IMAGE_SIZES = [
  { value: '256x256', label: '256×256' },
  { value: '512x512', label: '512×512' },
  { value: '1024x1024', label: '1024×1024' },
] as const

export async function createVariation(imageUrl: string, _prompt?: string): Promise<GeneratedImage | null> {
  return Promise.resolve({
    id: `var-${Date.now()}`,
    url: imageUrl,
    prompt: _prompt ?? 'Variation',
    createdAt: new Date().toISOString(),
  })
}

export async function upscaleImage(imageUrl: string): Promise<string | null> {
  return Promise.resolve(imageUrl)
}

export async function removeBackground(imageUrl: string): Promise<string | null> {
  return Promise.resolve(imageUrl)
}

export const SUGGESTED_PROMPTS = [
  'Minimalist icon for productivity app',
  'Abstract background for dashboard',
  'Illustration of a person focusing',
  'Geometric logo concept',
]
