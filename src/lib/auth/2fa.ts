/**
 * 2FA/TOTP via Supabase Auth.
 * Requires Supabase Auth MFA to be enabled in project settings.
 */
import { supabase } from '@/integrations/supabase/client'

export async function enrollTotp(): Promise<{ qrCode: string; secret: string } | { error: string }> {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'Authenticator App',
  })
  if (error) return { error: error.message }
  const qr = data.totp?.qr_code
  const secret = data.totp?.secret
  if (!qr || !secret) return { error: 'Failed to get TOTP secret' }
  return { qrCode: qr, secret }
}

export async function verifyTotpChallenge(code: string): Promise<{ error?: string }> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'Not authenticated' }
  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId: (session.user as any).factors?.[0]?.id ?? '',
    code,
  })
  if (error) return { error: error.message }
  return {}
}

export async function unenrollTotp(factorId: string): Promise<{ error?: string }> {
  const { error } = await supabase.auth.mfa.unenroll({ factorId })
  if (error) return { error: error.message }
  return {}
}

export async function listFactors(): Promise<{ id: string; friendly_name: string }[]> {
  const { data } = await supabase.auth.mfa.listFactors()
  return (data?.totp ?? []).map((f: { id: string; friendly_name?: string }) => ({
    id: f.id,
    friendly_name: f.friendly_name ?? 'Authenticator',
  }))
}
