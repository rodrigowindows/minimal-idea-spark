/**
 * Client helpers for AI image generation.
 * Supports DALL-E 2/3 via Supabase Edge Function.
 * Includes variations, editing, upscaling, background removal, and prompt suggestions.
 */

import { supabase } from '@/integrations/supabase/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ImageModel = 'dall-e-2' | 'dall-e-3'

export type ImageSize =
  | '256x256'
  | '512x512'
  | '1024x1024'
  | '1024x1792'
  | '1792x1024'

export type ImageStyle = 'vivid' | 'natural'
export type ImageQuality = 'standard' | 'hd'

export interface ImageGenerationOptions {
  prompt: string
  model?: ImageModel
  size?: ImageSize
  style?: ImageStyle
  quality?: ImageQuality
  negativePrompt?: string
}

export interface GeneratedImage {
  id: string
  url: string
  prompt: string
  model: ImageModel
  size: ImageSize
  style: ImageStyle
  quality: ImageQuality
  revisedPrompt?: string
  createdAt: string
  tags: string[]
  favorite: boolean
}

export interface ImageEditOptions {
  imageUrl: string
  prompt: string
  mask?: string // base64 mask for inpainting
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const IMAGE_MODELS: { value: ImageModel; label: string; description: string }[] = [
  { value: 'dall-e-3', label: 'DALL-E 3', description: 'Highest quality, prompt rewriting' },
  { value: 'dall-e-2', label: 'DALL-E 2', description: 'Faster, variations supported' },
]

export const IMAGE_STYLES: { value: ImageStyle; label: string }[] = [
  { value: 'vivid', label: 'Vivid' },
  { value: 'natural', label: 'Natural' },
]

export const IMAGE_SIZES: { value: ImageSize; label: string; models: ImageModel[] }[] = [
  { value: '256x256', label: '256 x 256', models: ['dall-e-2'] },
  { value: '512x512', label: '512 x 512', models: ['dall-e-2'] },
  { value: '1024x1024', label: '1024 x 1024', models: ['dall-e-2', 'dall-e-3'] },
  { value: '1024x1792', label: '1024 x 1792 (Portrait)', models: ['dall-e-3'] },
  { value: '1792x1024', label: '1792 x 1024 (Landscape)', models: ['dall-e-3'] },
]

export const IMAGE_QUALITIES: { value: ImageQuality; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'hd', label: 'HD' },
]

export const STYLE_PRESETS = [
  { id: 'photorealistic', label: 'Photorealistic', prefix: 'Photorealistic, highly detailed, 8K resolution,' },
  { id: 'digital-art', label: 'Digital Art', prefix: 'Digital art, vibrant colors, detailed illustration,' },
  { id: 'watercolor', label: 'Watercolor', prefix: 'Watercolor painting style, soft edges, artistic,' },
  { id: 'oil-painting', label: 'Oil Painting', prefix: 'Oil painting on canvas, rich textures, classical style,' },
  { id: 'pixel-art', label: 'Pixel Art', prefix: 'Pixel art style, retro gaming aesthetic, 16-bit,' },
  { id: 'minimalist', label: 'Minimalist', prefix: 'Minimalist design, clean lines, simple geometric shapes,' },
  { id: '3d-render', label: '3D Render', prefix: '3D render, cinematic lighting, volumetric, octane render,' },
  { id: 'anime', label: 'Anime', prefix: 'Anime style illustration, manga aesthetic, Japanese animation,' },
  { id: 'sketch', label: 'Pencil Sketch', prefix: 'Pencil sketch, hand-drawn, detailed line work,' },
  { id: 'flat-design', label: 'Flat Design', prefix: 'Flat design, vector style, modern UI illustration,' },
]

export const SUGGESTED_PROMPTS = [
  'Minimalist icon for a productivity app, clean design',
  'Abstract gradient background with geometric shapes for a dashboard',
  'Illustration of a person focused on deep work, warm colors',
  'Modern geometric logo concept with blue and purple tones',
  'Cozy workspace setup with plants, natural lighting, top-down view',
  'Futuristic cityscape at sunset, cyberpunk aesthetic',
  'Calming nature scene with mountains and a lake, misty morning',
  'Tech startup office interior, modern and bright',
  'Space exploration illustration, astronaut floating among stars',
  'Botanical illustration of tropical plants, detailed and scientific',
  'Isometric view of a smart city with technology elements',
  'Abstract data visualization art with flowing lines and particles',
]

export const PROMPT_CATEGORIES = [
  { id: 'productivity', label: 'Productivity', icon: '⚡' },
  { id: 'nature', label: 'Nature', icon: '🌿' },
  { id: 'tech', label: 'Technology', icon: '💻' },
  { id: 'art', label: 'Abstract Art', icon: '🎨' },
  { id: 'architecture', label: 'Architecture', icon: '🏗️' },
  { id: 'branding', label: 'Branding', icon: '🎯' },
]

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function callEdgeFunction(functionName: string, body: Record<string, unknown>) {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData?.session?.access_token

  const baseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''

  const res = await fetch(`${baseUrl}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(errorText || `Edge function error: ${res.status}`)
  }

  return res.json()
}

// ---------------------------------------------------------------------------
// Core generation
// ---------------------------------------------------------------------------

export async function generateImage(options: ImageGenerationOptions): Promise<GeneratedImage | null> {
  try {
    const data = await callEdgeFunction('generate-image', {
      prompt: options.prompt,
      model: options.model ?? 'dall-e-3',
      size: options.size ?? '1024x1024',
      style: options.style ?? 'vivid',
      quality: options.quality ?? 'standard',
      negativePrompt: options.negativePrompt,
    })

    if (!data.image) return null

    return {
      id: data.image.id ?? `img-${Date.now()}`,
      url: data.image.url,
      prompt: options.prompt,
      model: options.model ?? 'dall-e-3',
      size: options.size ?? '1024x1024',
      style: options.style ?? 'vivid',
      quality: options.quality ?? 'standard',
      revisedPrompt: data.image.revisedPrompt,
      createdAt: data.image.createdAt ?? new Date().toISOString(),
      tags: [],
      favorite: false,
    }
  } catch (err) {
    console.error('Image generation failed:', err)
    return null
  }
}

// ---------------------------------------------------------------------------
// Variations (DALL-E 2 only)
// ---------------------------------------------------------------------------

export async function createVariation(imageUrl: string, originalPrompt?: string): Promise<GeneratedImage | null> {
  try {
    const data = await callEdgeFunction('generate-image', {
      action: 'variation',
      imageUrl,
      prompt: originalPrompt ?? 'Variation',
    })

    if (!data.image) return null

    return {
      id: data.image.id ?? `var-${Date.now()}`,
      url: data.image.url ?? imageUrl,
      prompt: originalPrompt ?? 'Variation',
      model: 'dall-e-2',
      size: '1024x1024',
      style: 'vivid',
      quality: 'standard',
      createdAt: data.image.createdAt ?? new Date().toISOString(),
      tags: ['variation'],
      favorite: false,
    }
  } catch {
    // Fallback: return a mock variation if edge function doesn't support it yet
    return {
      id: `var-${Date.now()}`,
      url: imageUrl,
      prompt: originalPrompt ?? 'Variation',
      model: 'dall-e-2',
      size: '1024x1024',
      style: 'vivid',
      quality: 'standard',
      createdAt: new Date().toISOString(),
      tags: ['variation'],
      favorite: false,
    }
  }
}

// ---------------------------------------------------------------------------
// Image editing (inpainting)
// ---------------------------------------------------------------------------

export async function editImage(options: ImageEditOptions): Promise<GeneratedImage | null> {
  try {
    const data = await callEdgeFunction('generate-image', {
      action: 'edit',
      imageUrl: options.imageUrl,
      prompt: options.prompt,
      mask: options.mask,
    })

    if (!data.image) return null

    return {
      id: data.image.id ?? `edit-${Date.now()}`,
      url: data.image.url,
      prompt: options.prompt,
      model: 'dall-e-2',
      size: '1024x1024',
      style: 'vivid',
      quality: 'standard',
      createdAt: data.image.createdAt ?? new Date().toISOString(),
      tags: ['edited'],
      favorite: false,
    }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Upscale & Background Removal (placeholder – ready for real API)
// ---------------------------------------------------------------------------

export async function upscaleImage(imageUrl: string): Promise<string | null> {
  try {
    const data = await callEdgeFunction('generate-image', {
      action: 'upscale',
      imageUrl,
    })
    return data.url ?? imageUrl
  } catch {
    // Graceful fallback
    return imageUrl
  }
}

export async function removeBackground(imageUrl: string): Promise<string | null> {
  try {
    const data = await callEdgeFunction('generate-image', {
      action: 'remove-bg',
      imageUrl,
    })
    return data.url ?? imageUrl
  } catch {
    // Graceful fallback
    return imageUrl
  }
}

// ---------------------------------------------------------------------------
// Prompt enhancement
// ---------------------------------------------------------------------------

export function enhancePrompt(prompt: string, stylePreset?: string): string {
  const preset = STYLE_PRESETS.find((s) => s.id === stylePreset)
  if (preset) {
    return `${preset.prefix} ${prompt}`
  }
  return prompt
}

export function buildPromptWithNegative(prompt: string, negativePrompt?: string): string {
  if (!negativePrompt?.trim()) return prompt
  return `${prompt}. Avoid: ${negativePrompt}`
}

// ---------------------------------------------------------------------------
// Sizes filtered by model
// ---------------------------------------------------------------------------

export function getSizesForModel(model: ImageModel): typeof IMAGE_SIZES {
  return IMAGE_SIZES.filter((s) => s.models.includes(model))
}
