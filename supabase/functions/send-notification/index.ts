import { corsHeaders } from '../_shared/cors.ts'
import { getSupabaseClient } from '../_shared/supabase.ts'

type NotificationChannel = 'in_app' | 'email' | 'push'
type NotificationType =
  | 'task_due' | 'goal_progress' | 'habit_reminder' | 'achievement'
  | 'streak' | 'weekly_review' | 'calendar_event' | 'deep_work'
  | 'xp_milestone' | 'system' | 'insight' | 'general'

interface SendNotificationBody {
  user_id: string
  title: string
  body: string
  channel: NotificationChannel
  priority?: number
  type?: NotificationType
  group_key?: string
  action_url?: string
  icon?: string
  metadata?: Record<string, unknown>
  // Multi-channel: send to multiple channels at once
  channels?: NotificationChannel[]
}

interface NotificationRecord {
  user_id: string
  title: string
  body: string
  channel: NotificationChannel
  priority: number
  type: string
  group_key: string | null
  action_url: string | null
  icon: string | null
  metadata: Record<string, unknown> | null
  read: boolean
  archived: boolean
  snoozed_until: string | null
  created_at: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    let payload: SendNotificationBody
    try {
      payload = (await req.json()) as SendNotificationBody
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    if (!payload.user_id || !payload.title || !payload.body) {
      return new Response(JSON.stringify({ error: 'user_id, title, and body are required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const supabase = getSupabaseClient(req.headers.get('Authorization'))

    // Determine channels to send to
    const channels = payload.channels ?? [payload.channel ?? 'in_app']
    const now = new Date().toISOString()
    const results: { channel: NotificationChannel; success: boolean; error?: string }[] = []

    for (const channel of channels) {
      const record: NotificationRecord = {
        user_id: payload.user_id,
        title: payload.title,
        body: payload.body,
        channel,
        priority: payload.priority ?? 0,
        type: payload.type ?? 'general',
        group_key: payload.group_key ?? null,
        action_url: payload.action_url ?? null,
        icon: payload.icon ?? null,
        metadata: payload.metadata ?? null,
        read: false,
        archived: false,
        snoozed_until: null,
        created_at: now,
      }

      if (channel === 'in_app') {
        const { error } = await supabase.from('notifications').insert(record)
        results.push({ channel, success: !error, error: error?.message })
      } else if (channel === 'push') {
        // Push notification via web-push or FCM (placeholder - requires push subscription setup)
        const { error } = await supabase.from('notifications').insert(record)
        results.push({ channel, success: !error, error: error?.message })
      } else if (channel === 'email') {
        // Email notification placeholder - would integrate with email service (e.g., Resend, SendGrid)
        const { error } = await supabase.from('notifications').insert(record)
        results.push({ channel, success: !error, error: error?.message })
      }
    }

    const allSuccess = results.every(r => r.success)
    return new Response(
      JSON.stringify({
        ok: allSuccess,
        channels: results,
        notification_count: results.filter(r => r.success).length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: allSuccess ? 200 : 207,
      }
    )
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
