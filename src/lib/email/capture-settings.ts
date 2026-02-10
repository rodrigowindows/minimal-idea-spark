/**
 * Email capture settings service: manage user's unique capture email address and preferences.
 * Uses localStorage for client-side with Supabase sync via edge functions.
 */

import { supabase } from '@/integrations/supabase/client'
import { generateCaptureEmail, setCaptureEmail, getCaptureEmail, clearCaptureEmail } from './inbound'

export interface EmailCaptureSettings {
  id?: string
  captureEmail: string
  isActive: boolean
  rateLimitPerHour: number
}

const CAPTURE_SETTINGS_KEY = 'lifeos_email_capture_settings'

function getLocalSettings(): EmailCaptureSettings | null {
  try {
    const stored = localStorage.getItem(CAPTURE_SETTINGS_KEY)
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  return null
}

function saveLocalSettings(settings: EmailCaptureSettings): void {
  try {
    localStorage.setItem(CAPTURE_SETTINGS_KEY, JSON.stringify(settings))
    setCaptureEmail(settings.captureEmail)
  } catch { /* ignore */ }
}

/**
 * Initialize or retrieve email capture settings for a user.
 */
export async function getOrCreateCaptureSettings(userId: string): Promise<EmailCaptureSettings> {
  // Check local cache first
  const local = getLocalSettings()
  if (local) return local

  // Try to fetch from Supabase
  try {
    const { data, error } = await supabase
      .from('email_capture_settings' as any)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (data && !error) {
      const settings: EmailCaptureSettings = {
        id: (data as any).id,
        captureEmail: (data as any).capture_email,
        isActive: (data as any).is_active,
        rateLimitPerHour: (data as any).rate_limit_per_hour,
      }
      saveLocalSettings(settings)
      return settings
    }
  } catch { /* Supabase may not have table yet */ }

  // Generate new capture email
  const captureEmail = generateCaptureEmail(userId)
  const settings: EmailCaptureSettings = {
    captureEmail,
    isActive: true,
    rateLimitPerHour: 20,
  }

  // Try to persist to Supabase
  try {
    const { data } = await supabase
      .from('email_capture_settings' as any)
      .insert({
        user_id: userId,
        capture_email: captureEmail,
        is_active: true,
        rate_limit_per_hour: 20,
      } as any)
      .select('id')
      .single()

    if (data) {
      settings.id = (data as any).id
    }
  } catch { /* ignore - will work with local only */ }

  saveLocalSettings(settings)
  return settings
}

/**
 * Toggle the capture email active status.
 */
export async function toggleCaptureEmail(userId: string, isActive: boolean): Promise<void> {
  const settings = getLocalSettings()
  if (settings) {
    settings.isActive = isActive
    saveLocalSettings(settings)
  }

  try {
    await supabase
      .from('email_capture_settings' as any)
      .update({ is_active: isActive } as any)
      .eq('user_id', userId)
  } catch { /* ignore */ }
}

/**
 * Regenerate capture email address for a user.
 */
export async function regenerateCaptureEmail(userId: string): Promise<string> {
  const newEmail = generateCaptureEmail(userId + '-' + Date.now())
  const settings: EmailCaptureSettings = {
    captureEmail: newEmail,
    isActive: true,
    rateLimitPerHour: 20,
  }

  try {
    await supabase
      .from('email_capture_settings' as any)
      .update({ capture_email: newEmail } as any)
      .eq('user_id', userId)
  } catch { /* ignore */ }

  saveLocalSettings(settings)
  return newEmail
}

/**
 * Clear all local email capture data.
 */
export function clearLocalCaptureData(): void {
  try {
    localStorage.removeItem(CAPTURE_SETTINGS_KEY)
    clearCaptureEmail()
  } catch { /* ignore */ }
}
