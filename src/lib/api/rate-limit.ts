/**
 * Client-side rate limiting helper for API key usage tracking.
 * The actual enforcement happens in the api-auth edge function;
 * this module provides UI display utilities.
 */

import { supabase } from '@/integrations/supabase/client'

export interface RateLimitInfo {
  requests_today: number
  requests_this_month: number
  limit_per_minute: number
  limit_per_day: number
  limit_per_month: number
}

const DEFAULT_LIMITS: RateLimitInfo = {
  requests_today: 0,
  requests_this_month: 0,
  limit_per_minute: 60,
  limit_per_day: 10_000,
  limit_per_month: 100_000,
}

export async function getRateLimitInfo(apiKeyId?: string): Promise<RateLimitInfo> {
  if (!apiKeyId) return DEFAULT_LIMITS

  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [todayRes, monthRes] = await Promise.all([
    supabase
      .from('api_usage_logs')
      .select('id', { count: 'exact', head: true })
      .eq('api_key_id', apiKeyId)
      .gte('created_at', startOfDay),
    supabase
      .from('api_usage_logs')
      .select('id', { count: 'exact', head: true })
      .eq('api_key_id', apiKeyId)
      .gte('created_at', startOfMonth),
  ])

  return {
    requests_today: todayRes.count ?? 0,
    requests_this_month: monthRes.count ?? 0,
    limit_per_minute: DEFAULT_LIMITS.limit_per_minute,
    limit_per_day: DEFAULT_LIMITS.limit_per_day,
    limit_per_month: DEFAULT_LIMITS.limit_per_month,
  }
}

export function formatRateLimit(info: RateLimitInfo): string {
  const pctDay = Math.round((info.requests_today / info.limit_per_day) * 100)
  const pctMonth = Math.round((info.requests_this_month / info.limit_per_month) * 100)
  return `Today: ${info.requests_today.toLocaleString()} / ${info.limit_per_day.toLocaleString()} (${pctDay}%) | Month: ${info.requests_this_month.toLocaleString()} / ${info.limit_per_month.toLocaleString()} (${pctMonth}%)`
}
