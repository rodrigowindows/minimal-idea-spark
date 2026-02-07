import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface Presence {
  user_id: string;
  username: string;
  avatar?: string;
  cursor?: { x: number; y: number };
  current_page?: string;
  last_seen: string;
}

export interface CollaborativeEdit {
  id: string;
  resource_type: string;
  resource_id: string;
  user_id: string;
  field: string;
  value: any;
  timestamp: string;
}

export class CollaborationManager {
  private channel: RealtimeChannel | null = null;
  private presenceCallbacks: ((presences: Presence[]) => void)[] = [];
  private editCallbacks: ((edit: CollaborativeEdit) => void)[] = [];

  constructor(private roomId: string) {}

  async join(user: Presence) {
    this.channel = supabase.channel(`room:${this.roomId}`, {
      config: {
        presence: {
          key: user.user_id,
        },
      },
    });

    this.channel
      .on('presence', { event: 'sync' }, () => {
        const state = this.channel!.presenceState();
        const presences = Object.values(state).flat() as unknown as Presence[];
        this.presenceCallbacks.forEach(cb => cb(presences));
      })
      .on('broadcast', { event: 'edit' }, ({ payload }) => {
        this.editCallbacks.forEach(cb => cb(payload as CollaborativeEdit));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await this.channel!.track(user);
        }
      });

    return this;
  }

  async updatePresence(updates: Partial<Presence>) {
    if (!this.channel) return;
    const state = this.channel.presenceState();
    const currentPresence = (Object.values(state).flat()[0] as unknown as Presence) || {};
    await this.channel.track({ ...currentPresence, ...updates });
  }

  async sendEdit(edit: Omit<CollaborativeEdit, 'id' | 'timestamp'>) {
    if (!this.channel) return;

    const fullEdit: CollaborativeEdit = {
      ...edit,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };

    await this.channel.send({
      type: 'broadcast',
      event: 'edit',
      payload: fullEdit,
    });

    // Save to database for conflict resolution
    await (supabase as any).from('collaborative_edits').insert(fullEdit);
  }

  onPresenceChange(callback: (presences: Presence[]) => void) {
    this.presenceCallbacks.push(callback);
    return () => {
      this.presenceCallbacks = this.presenceCallbacks.filter(cb => cb !== callback);
    };
  }

  onEdit(callback: (edit: CollaborativeEdit) => void) {
    this.editCallbacks.push(callback);
    return () => {
      this.editCallbacks = this.editCallbacks.filter(cb => cb !== callback);
    };
  }

  async leave() {
    if (this.channel) {
      await this.channel.untrack();
      await this.channel.unsubscribe();
      this.channel = null;
    }
  }
}

export async function getEditHistory(
  resourceType: string,
  resourceId: string,
  limit = 50
): Promise<CollaborativeEdit[]> {
  const { data, error } = await (supabase as any)
    .from('collaborative_edits')
    .select('*')
    .eq('resource_type', resourceType)
    .eq('resource_id', resourceId)
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function resolveConflicts(
  edits: CollaborativeEdit[]
): Promise<Record<string, any>> {
  // Last-write-wins strategy
  const resolved: Record<string, any> = {};

  const sortedEdits = [...edits].sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  for (const edit of sortedEdits) {
    if (!(edit.field in resolved)) {
      resolved[edit.field] = edit.value;
    }
  }

  return resolved;
}
