/**
 * Outgoing webhooks: notify external URL on events (opportunity created, status changed, journal).
 * Stub: stores in localStorage; production would use Supabase table webhook_endpoints.
 */

const STORAGE_KEY = 'lifeos_webhooks'

export interface WebhookEndpoint {
  id: string
  url: string
  events: ('opportunity_created' | 'opportunity_updated' | 'journal_created')[]
  enabled: boolean
  created_at: string
}

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

export function listWebhooks(): WebhookEndpoint[] {
  return loadWebhooks()
}

export function addWebhook(url: string, events: WebhookEndpoint['events']): WebhookEndpoint {
  const id = `wh-${Date.now()}`
  const endpoint: WebhookEndpoint = {
    id,
    url,
    events,
    enabled: true,
    created_at: new Date().toISOString(),
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
  webhooks[idx] = { ...webhooks[idx], ...patch }
  saveWebhooks(webhooks)
  return true
}

export function removeWebhook(id: string): boolean {
  const webhooks = loadWebhooks().filter((w) => w.id !== id)
  if (webhooks.length === loadWebhooks().length) return false
  saveWebhooks(webhooks)
  return true
}
