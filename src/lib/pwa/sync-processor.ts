/**
 * Processes sync queue items against Supabase (opportunities, daily_logs).
 * Used when coming back online to flush the queue.
 * Uses sync-id-map so update/delete of offline-created items resolve to the correct server id.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { QueuedItem, ProcessItemResult, ProcessQueueHandler } from './sync-queue';
import { saveServerId, getServerId } from './sync-id-map';

export function createSyncProcessor(
  supabase: SupabaseClient
): ProcessQueueHandler {
  return async function processItem(item: QueuedItem): Promise<ProcessItemResult> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      return { ok: false, conflict: 'rejected' };
    }
    const userId = session.user.id;

    switch (item.type) {
      case 'create_opportunity': {
        const p = item.payload as {
          domain_id: string | null;
          title: string;
          description: string | null;
          type: string;
          status: string;
          priority: number;
          strategic_value: number | null;
        };
        const { data, error } = await supabase
          .from('opportunities')
          .insert({
            user_id: userId,
            domain_id: p.domain_id || null,
            title: p.title,
            description: p.description ?? null,
            type: p.type ?? 'action',
            status: p.status ?? 'backlog',
            priority: p.priority ?? 5,
            strategic_value: p.strategic_value ?? null,
          })
          .select('id')
          .single();
        if (error) {
          if (error.code === '23505') {
            return { ok: false, conflict: 'newer_on_server' };
          }
          throw error;
        }
        const serverId = data?.id;
        if (serverId) saveServerId('opportunity', item.localId, serverId);
        return { ok: true, serverId };
      }

      case 'update_opportunity': {
        const p = item.payload as { id: string; [k: string]: unknown };
        const serverId = getServerId('opportunity', item.localId) || (p.server_id as string) || p.id;
        const { error } = await supabase
          .from('opportunities')
          .update({
            ...(p.title !== undefined && { title: p.title }),
            ...(p.description !== undefined && { description: p.description }),
            ...(p.type !== undefined && { type: p.type }),
            ...(p.status !== undefined && { status: p.status }),
            ...(p.priority !== undefined && { priority: p.priority }),
            ...(p.strategic_value !== undefined && { strategic_value: p.strategic_value }),
            ...(p.domain_id !== undefined && { domain_id: p.domain_id }),
          })
          .eq('id', serverId)
          .eq('user_id', userId);
        if (error) throw error;
        return { ok: true };
      }

      case 'delete_opportunity': {
        const p = item.payload as { id: string; server_id?: string };
        const serverId = getServerId('opportunity', item.localId) || p.server_id || p.id;
        const { error } = await supabase
          .from('opportunities')
          .delete()
          .eq('id', serverId)
          .eq('user_id', userId);
        if (error) throw error;
        return { ok: true };
      }

      case 'create_daily_log': {
        const p = item.payload as {
          content: string;
          mood: string | null;
          energy_level: number;
          log_date: string;
        };
        const { data, error } = await supabase
          .from('daily_logs')
          .insert({
            user_id: userId,
            content: p.content,
            mood: p.mood ?? null,
            energy_level: p.energy_level ?? null,
            log_date: p.log_date,
          })
          .select('id')
          .single();
        if (error) throw error;
        const logServerId = data?.id;
        if (logServerId) saveServerId('daily_log', item.localId, logServerId);
        return { ok: true, serverId: logServerId };
      }

      case 'update_daily_log': {
        const p = item.payload as { id: string; server_id?: string; [k: string]: unknown };
        const serverId = getServerId('daily_log', item.localId) || (p.server_id as string) || p.id;
        const { error } = await supabase
          .from('daily_logs')
          .update({
            ...(p.content !== undefined && { content: p.content }),
            ...(p.mood !== undefined && { mood: p.mood }),
            ...(p.energy_level !== undefined && { energy_level: p.energy_level }),
            ...(p.log_date !== undefined && { log_date: p.log_date }),
          })
          .eq('id', serverId)
          .eq('user_id', userId);
        if (error) throw error;
        return { ok: true };
      }

      case 'delete_daily_log': {
        const p = item.payload as { id: string; server_id?: string };
        const serverId = getServerId('daily_log', item.localId) || p.server_id || p.id;
        const { error } = await supabase
          .from('daily_logs')
          .delete()
          .eq('id', serverId)
          .eq('user_id', userId);
        if (error) throw error;
        return { ok: true };
      }

      default:
        throw new Error(`Unknown sync action: ${item.type}`);
    }
  };
}
