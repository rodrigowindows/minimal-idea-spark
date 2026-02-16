/**
 * Outgoing webhooks: notify external URL on events.
 * Hybrid: localStorage for offline fallback, Supabase for production.
 */

import { supabase } from '@/integrations/supabase/client'

const STORAGE_KEY = 'lifeos_webhooks'

export type WebhookEvent =
  | 'opportunity_created'
  | 'opportunity_updated'
  | 'opportunity_deleted'
  | 'journal_created'
  | 'habit_completed'
  | 'goal_completed'
  | 'import_completed'

export const WEBHOOK_EVENT_LABELS: Record<WebhookEvent, string> = {
  opportunity_created: 'Opportunity Created',
  opportunity_updated: 'Opportunity Updated',
  opportunity_deleted: 'Opportunity Deleted',
  journal_created: 'Journal Entry Created',
  habit_completed: 'Habit Completed',
  goal_completed: 'Goal Completed',
  import_completed: 'Batch Import Completed',
}

export interface WebhookEndpoint {
  id: string
  url: string
  secret: string
  events: WebhookEvent[]
  enabled: boolean
  description: string
  created_at: string
  updated_at: string
}

export interface WebhookLog {
  id: string
  webhook_id: string
  event: string
  payload: Record<string, unknown>
  response_status: number | null
  response_body: string | null
  attempt: number
  success: boolean
  created_at: string
}

// --------------- localStorage fallback ---------------

function loadWebhooks(): WebhookEndpoint[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return []
}

function saveWebhooks(webhooks: WebhookEndpoint[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(webhooks))
}

// --------------- Public API ---------------

export function listWebhooks(): WebhookEndpoint[] {
  return loadWebhooks()
}

export async function listWebhooksAsync(): Promise<WebhookEndpoint[]> {
  const { data, error } = await (supabase as any)
    .from('webhook_endpoints')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !data) return loadWebhooks()

  const endpoints = data.map((w: any) => ({
    id: w.id,
    url: w.url,
    secret: w.secret ?? '',
    events: (w.events ?? []) as WebhookEvent[],
    enabled: w.enabled ?? true,
    description: w.description ?? '',
    created_at: w.created_at,
    updated_at: w.updated_at ?? w.created_at,
  }))

  saveWebhooks(endpoints)
  return endpoints
}

export function addWebhook(
  url: string,
  events: WebhookEvent[],
  description = '',
): WebhookEndpoint {
  const id = `wh-${Date.now()}`
  const secret = `whsec_${crypto.randomUUID().replace(/-/g, '')}`
  const now = new Date().toISOString()
  const endpoint: WebhookEndpoint = {
    id,
    url,
    secret,
    events,
    enabled: true,
    description,
    created_at: now,
    updated_at: now,
  }
  const webhooks = loadWebhooks()
  webhooks.push(endpoint)
  saveWebhooks(webhooks)
  return endpoint
}

export async function addWebhookAsync(
  url: string,
  events: WebhookEvent[],
  description = '',
): Promise<WebhookEndpoint> {
  const secret = `whsec_${crypto.randomUUID().replace(/-/g, '')}`

  const { data, error } = await (supabase as any)
    .from('webhook_endpoints')
    .insert({ url, secret, events, description, enabled: true })
    .select()
    .single()

  if (error || !data) return addWebhook(url, events, description)

  const endpoint: WebhookEndpoint = {
    id: data.id,
    url: data.url,
    secret: data.secret,
    events: (data.events ?? []) as WebhookEvent[],
    enabled: data.enabled ?? true,
    description: data.description ?? '',
    created_at: data.created_at,
    updated_at: data.updated_at ?? data.created_at,
  }

  const webhooks = loadWebhooks()
  webhooks.push(endpoint)
  saveWebhooks(webhooks)
  return endpoint
}

export function updateWebhook(id: string, patch: Partial<WebhookEndpoint>): boolean {
  const webhooks = loadWebhooks()
  const idx = webhooks.findIndex((w) => w.id === id)
  if (idx === -1) return false
  webhooks[idx] = { ...webhooks[idx], ...patch, updated_at: new Date().toISOString() }
  saveWebhooks(webhooks)
  return true
}

export async function updateWebhookAsync(id: string, patch: Partial<Pick<WebhookEndpoint, 'url' | 'events' | 'enabled' | 'description'>>): Promise<boolean> {
  const { error } = await (supabase as any)
    .from('webhook_endpoints')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return updateWebhook(id, patch)

  updateWebhook(id, patch)
  return true
}

export function removeWebhook(id: string): boolean {
  const all = loadWebhooks()
  const webhooks = all.filter((w) => w.id !== id)
  if (webhooks.length === all.length) return false
  saveWebhooks(webhooks)
  return true
}

export async function removeWebhookAsync(id: string): Promise<boolean> {
  const { error } = await (supabase as any)
    .from('webhook_endpoints')
    .delete()
    .eq('id', id)

  if (error) return removeWebhook(id)

  removeWebhook(id)
  return true
}

/** Get delivery logs for a webhook endpoint */
export async function getWebhookLogs(webhookId: string, limit = 50): Promise<WebhookLog[]> {
  const { data } = await (supabase as any)
    .from('webhook_logs')
    .select('*')
    .eq('webhook_id', webhookId)
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data ?? []).map((l: any) => ({
    id: l.id,
    webhook_id: l.webhook_id,
    event: l.event,
    payload: l.payload ?? {},
    response_status: l.response_status,
    response_body: l.response_body,
    attempt: l.attempt ?? 1,
    success: l.success ?? false,
    created_at: l.created_at,
  }))
}

/** Fire an event to all matching webhooks (client-side trigger via edge function) */
export async function fireWebhookEvent(event: WebhookEvent, payload: Record<string, unknown>): Promise<void> {
  try {
    await supabase.functions.invoke('webhook-deliver', {
      body: { event, payload },
    })
  } catch {
    // Best-effort: log locally if edge function unavailable
    console.warn('[Webhooks] Failed to fire event:', event)
  }
}
