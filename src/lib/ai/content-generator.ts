/**
 * Content Generator Service
 * Manages AI content generation with history and ratings
 */

import { supabase } from '@/integrations/supabase/client'
import type { ContentType, ToneStyle } from './prompt-library'
import { buildPrompt } from './prompt-library'

export interface GenerationRequest {
  contentType: ContentType
  params: Record<string, any>
  tone?: ToneStyle
  previousContent?: string // For refinement
  refinementInstructions?: string // Specific refinement requests
}

export interface GenerationResult {
  id: string
  content: string
  contentType: ContentType
  params: Record<string, any>
  rating?: number
  createdAt: Date
}

export interface GenerationHistory {
  generations: GenerationResult[]
  currentIndex: number
}

/**
 * Generate content using AI
 */
export async function generateContent(
  request: GenerationRequest
): Promise<{ content: string; error?: string }> {
  try {
    const prompt = buildPrompt(request.contentType, {
      ...request.params,
      tone: request.tone
    })

    // If refining previous content, add it to the context
    let messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: prompt.system }
    ]

    if (request.previousContent && request.refinementInstructions) {
      messages.push({
        role: 'user',
        content: `Previous version:\\n${request.previousContent}\\n\\nPlease refine it: ${request.refinementInstructions}`
      })
    } else {
      messages.push({ role: 'user', content: prompt.user })
    }

    const { data, error } = await supabase.functions.invoke('generate-content', {
      body: { messages, contentType: request.contentType }
    })

    if (error) throw error
    if (!data?.content) throw new Error('No content generated')

    return { content: data.content }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate content'
    console.error('Content generation error:', err)
    return { content: '', error: message }
  }
}

/**
 * Generate multiple variations
 */
export async function generateVariations(
  request: GenerationRequest,
  count: number = 3
): Promise<string[]> {
  const variations: string[] = []
  
  for (let i = 0; i < count; i++) {
    const result = await generateContent({
      ...request,
      params: {
        ...request.params,
        variation: i + 1
      }
    })
    
    if (result.content) {
      variations.push(result.content)
    }
  }
  
  return variations
}

/**
 * Refine existing content
 */
export async function refineContent(
  originalContent: string,
  instructions: string,
  contentType: ContentType = 'refine_text'
): Promise<{ content: string; error?: string }> {
  return generateContent({
    contentType,
    params: {},
    previousContent: originalContent,
    refinementInstructions: instructions
  })
}

/**
 * Expand a brief idea into detailed content
 */
export async function expandIdea(
  idea: string,
  direction?: string,
  tone?: ToneStyle
): Promise<{ content: string; error?: string }> {
  return generateContent({
    contentType: 'expand_idea',
    params: { idea, direction },
    tone
  })
}

/**
 * Brainstorm ideas on a topic
 */
export async function brainstormIdeas(
  topic: string,
  constraints?: string,
  context?: string
): Promise<{ content: string; error?: string }> {
  return generateContent({
    contentType: 'brainstorm',
    params: { topic, constraints, context }
  })
}

// Local storage key for history
const HISTORY_STORAGE_KEY = 'content_generator_history'

/**
 * Save generation to local history
 */
export function saveToHistory(result: GenerationResult): void {
  try {
    const history = getHistory()
    history.generations.unshift(result)
    
    // Keep only last 50 generations
    if (history.generations.length > 50) {
      history.generations = history.generations.slice(0, 50)
    }
    
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history))
  } catch (err) {
    console.error('Failed to save to history:', err)
  }
}

/**
 * Get generation history from local storage
 */
export function getHistory(): GenerationHistory {
  try {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY)
    if (!stored) return { generations: [], currentIndex: -1 }
    
    const parsed = JSON.parse(stored)
    return {
      generations: parsed.generations || [],
      currentIndex: parsed.currentIndex ?? -1
    }
  } catch {
    return { generations: [], currentIndex: -1 }
  }
}

/**
 * Rate a generation
 */
export function rateGeneration(id: string, rating: number): void {
  try {
    const history = getHistory()
    const generation = history.generations.find(g => g.id === id)
    
    if (generation) {
      generation.rating = rating
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history))
    }
  } catch (err) {
    console.error('Failed to rate generation:', err)
  }
}

/**
 * Get generations by content type
 */
export function getGenerationsByType(contentType: ContentType): GenerationResult[] {
  const history = getHistory()
  return history.generations.filter(g => g.contentType === contentType)
}

/**
 * Clear history
 */
export function clearHistory(): void {
  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY)
  } catch (err) {
    console.error('Failed to clear history:', err)
  }
}

/**
 * Get top rated generations
 */
export function getTopRated(limit: number = 10): GenerationResult[] {
  const history = getHistory()
  return history.generations
    .filter(g => g.rating && g.rating >= 4)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, limit)
}
