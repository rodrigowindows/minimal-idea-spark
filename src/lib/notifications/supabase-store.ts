/**
 * Supabase-backed notification store.
 * Drop-in replacement for localStorage-based notifications.
 * useNotifications hook calls these functions.
 */
import { supabase } from '@/integrations/supabase/client'
import type { AppNotification, NotificationChannel, NotificationType, NotificationPreferences } from './manager'

const PREFS_KEY = 'minimal_idea_spark_notification_prefs'

// Map DB row to AppNotification
export function rowToNotification(row: any): AppNotification {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    channel: row.channel as NotificationChannel,
    type: row.type as NotificationType,
    priority: row.priority,
    read: row.read,
    archived: row.archived,
    createdAt: row.created_at,
    snoozedUntil: row.snoozed_until ?? null,
    groupKey: row.group_key ?? undefined,
    actionUrl: row.action_url ?? undefined,
    icon: row.icon ?? undefined,
    metadata: row.metadata ?? undefined,
  }
}

export async function fetchActiveNotifications(userId: string): Promise<AppNotification[]> {
  const { data } = await (supabase as any)
    .from('notifications')
    .select('*')
    .eq('archived', false)
    .or('snoozed_until.is.null,snoozed_until.lte.' + new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(100)
  return (data ?? []).map(rowToNotification)
}

export async function fetchArchivedNotifications(userId: string): Promise<AppNotification[]> {
  const { data } = await (supabase as any)
    .from('notifications')
    .select('*')
    .eq('archived', true)
    .order('created_at', { ascending: false })
    .limit(50)
  return (data ?? []).map(rowToNotification)
}

export async function fetchSnoozedNotifications(userId: string): Promise<AppNotification[]> {
  const now = new Date().toISOString()
  const { data } = await (supabase as any)
    .from('notifications')
    .select('*')
    .eq('archived', false)
    .gt('snoozed_until', now)
    .order('snoozed_until', { ascending: true })
  return (data ?? []).map(rowToNotification)
}

export async function addNotificationToDb(
  userId: string,
  n: Omit<AppNotification, 'id' | 'read' | 'createdAt' | 'archived'>
): Promise<AppNotification | null> {
  const { data, error } = await (supabase as any)
    .from('notifications')
    .insert({
      user_id: userId,
      title: n.title,
      body: n.body,
      channel: n.channel,
      type: n.type ?? 'general',
      priority: n.priority ?? 0,
      group_key: n.groupKey ?? null,
      action_url: n.actionUrl ?? null,
      icon: n.icon ?? null,
      metadata: n.metadata ?? {},
      snoozed_until: n.snoozedUntil ?? null,
    })
    .select()
    .single()
  if (error || !data) return null
  return rowToNotification(data)
}

export async function markAsReadDb(id: string): Promise<void> {
  await (supabase as any).from('notifications').update({ read: true }).eq('id', id)
}

export async function markAllAsReadDb(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await (supabase as any).from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
}

export async function archiveNotificationDb(id: string): Promise<void> {
  await (supabase as any).from('notifications').update({ archived: true, read: true }).eq('id', id)
}

export async function archiveAllReadDb(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await (supabase as any).from('notifications').update({ archived: true }).eq('user_id', user.id).eq('read', true).eq('archived', false)
}

export async function removeNotificationDb(id: string): Promise<void> {
  await (supabase as any).from('notifications').delete().eq('id', id)
}

export async function snoozeNotificationDb(id: string, until: Date): Promise<void> {
  await (supabase as any).from('notifications').update({
    snoozed_until: until.toISOString(),
    read: true,
  }).eq('id', id)
}

export async function unsnoozeExpiredDb(): Promise<number> {
  const now = new Date().toISOString()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0
  const { data } = await (supabase as any)
    .from('notifications')
    .update({ snoozed_until: null, read: false })
    .eq('user_id', user.id)
    .eq('archived', false)
    .not('snoozed_until', 'is', null)
    .lte('snoozed_until', now)
    .select('id')
  return data?.length ?? 0
}

// Preferences still in localStorage (per-device preference is fine)
export function getPreferences(): NotificationPreferences {
  const DEFAULT_PREFS: NotificationPreferences = {
    enabled: true,
    channels: { in_app: true, email: false, push: true },
    types: {
      task_due: true, goal_progress: true, habit_reminder: true,
      achievement: true, streak: true, weekly_review: true,
      calendar_event: true, deep_work: true, xp_milestone: true,
      system: true, insight: true, general: true,
    },
    quietHoursStart: null, quietHoursEnd: null,
    digestFrequency: 'none', digestTime: '09:00',
    groupSimilar: true, maxVisible: 50,
  }
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return { ...DEFAULT_PREFS }
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

export function setPreferencesLocal(prefs: Partial<NotificationPreferences>): NotificationPreferences {
  const current = getPreferences()
  const updated = { ...current, ...prefs }
  localStorage.setItem(PREFS_KEY, JSON.stringify(updated))
  return updated
}
