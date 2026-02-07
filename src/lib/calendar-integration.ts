import { supabase } from '@/integrations/supabase/client';

// Supabase-backed calendar event type (for future remote sync)
export interface SupabaseCalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  color?: string;
  external_id?: string;
  external_provider?: 'google' | 'outlook';
  reminder_minutes?: number;
  created_at: string;
  updated_at: string;
}

export async function getCalendarEvents(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<SupabaseCalendarEvent[]> {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', userId)
    .gte('start_time', startDate.toISOString())
    .lte('end_time', endDate.toISOString())
    .order('start_time', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createCalendarEvent(
  event: Omit<SupabaseCalendarEvent, 'id' | 'created_at' | 'updated_at'>
): Promise<SupabaseCalendarEvent> {
  const { data, error } = await supabase
    .from('calendar_events')
    .insert(event)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCalendarEvent(
  eventId: string,
  updates: Partial<SupabaseCalendarEvent>
): Promise<SupabaseCalendarEvent> {
  const { data, error } = await supabase
    .from('calendar_events')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', eventId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', eventId);

  if (error) throw error;
}

export async function syncGoogleCalendar(userId: string, accessToken: string) {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-sync`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify({
        provider: 'google',
        access_token: accessToken,
        user_id: userId,
      }),
    }
  );

  if (!response.ok) throw new Error('Calendar sync failed');
  return await response.json();
}

export async function getWorkloadAnalysis(userId: string, date: Date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const events = await getCalendarEvents(userId, startOfDay, endOfDay);

  const totalMinutes = events.reduce((acc, event) => {
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    return acc + (end.getTime() - start.getTime()) / (1000 * 60);
  }, 0);

  const workingHours = 8 * 60;
  const utilization = (totalMinutes / workingHours) * 100;

  return {
    totalEvents: events.length,
    totalMinutes,
    utilizationPercent: Math.min(utilization, 100),
    events,
  };
}
