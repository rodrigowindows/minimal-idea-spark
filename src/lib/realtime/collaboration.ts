import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface Presence {
  user_id: string;
  username: string;
  avatar?: string;
  cursor?: { x: number; y: number };
  current_page?: string;
  last_seen: string;
  is_editing?: string; // resource_id being edited
  editing_field?: string; // field being edited
}

export interface CollaborativeEdit {
  id: string;
  resource_type: string;
  resource_id: string;
  user_id: string;
  username: string;
  field: string;
  old_value?: any;
  value: any;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  workspace_id: string;
  user_id: string;
  username: string;
  avatar?: string;
  content: string;
  timestamp: string;
  type: 'message' | 'system';
}

export interface ActiveEditor {
  user_id: string;
  username: string;
  resource_type: string;
  resource_id: string;
  field: string;
  started_at: string;
}

export class CollaborationManager {
  private channel: RealtimeChannel | null = null;
  private chatChannel: RealtimeChannel | null = null;
  private presenceCallbacks: ((presences: Presence[]) => void)[] = [];
  private editCallbacks: ((edit: CollaborativeEdit) => void)[] = [];
  private chatCallbacks: ((msg: ChatMessage) => void)[] = [];
  private activeEditorCallbacks: ((editors: ActiveEditor[]) => void)[] = [];
  private activeEditors: Map<string, ActiveEditor> = new Map();

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
      .on('broadcast', { event: 'editing_start' }, ({ payload }) => {
        const editor = payload as ActiveEditor;
        this.activeEditors.set(`${editor.user_id}:${editor.resource_id}:${editor.field}`, editor);
        this.notifyActiveEditors();
      })
      .on('broadcast', { event: 'editing_stop' }, ({ payload }) => {
        const { user_id, resource_id, field } = payload as ActiveEditor;
        this.activeEditors.delete(`${user_id}:${resource_id}:${field}`);
        this.notifyActiveEditors();
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await this.channel!.track(user);
        }
      });

    // Chat channel
    this.chatChannel = supabase.channel(`chat:${this.roomId}`);
    this.chatChannel
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        this.chatCallbacks.forEach(cb => cb(payload as ChatMessage));
      })
      .subscribe();

    return this;
  }

  private notifyActiveEditors() {
    const editors = Array.from(this.activeEditors.values());
    this.activeEditorCallbacks.forEach(cb => cb(editors));
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

    // Save to localStorage for history
    saveEditToHistory(this.roomId, fullEdit);
  }

  async startEditing(editor: Omit<ActiveEditor, 'started_at'>) {
    if (!this.channel) return;
    const fullEditor: ActiveEditor = {
      ...editor,
      started_at: new Date().toISOString(),
    };
    await this.channel.send({
      type: 'broadcast',
      event: 'editing_start',
      payload: fullEditor,
    });
  }

  async stopEditing(editor: Pick<ActiveEditor, 'user_id' | 'resource_id' | 'field'>) {
    if (!this.channel) return;
    await this.channel.send({
      type: 'broadcast',
      event: 'editing_stop',
      payload: editor,
    });
  }

  async sendChatMessage(msg: Omit<ChatMessage, 'id' | 'timestamp'>) {
    if (!this.chatChannel) return;

    const fullMsg: ChatMessage = {
      ...msg,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };

    await this.chatChannel.send({
      type: 'broadcast',
      event: 'message',
      payload: fullMsg,
    });

    // Save to localStorage
    saveChatMessage(this.roomId, fullMsg);

    return fullMsg;
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

  onChat(callback: (msg: ChatMessage) => void) {
    this.chatCallbacks.push(callback);
    return () => {
      this.chatCallbacks = this.chatCallbacks.filter(cb => cb !== callback);
    };
  }

  onActiveEditorsChange(callback: (editors: ActiveEditor[]) => void) {
    this.activeEditorCallbacks.push(callback);
    return () => {
      this.activeEditorCallbacks = this.activeEditorCallbacks.filter(cb => cb !== callback);
    };
  }

  async leave() {
    if (this.channel) {
      await this.channel.untrack();
      await this.channel.unsubscribe();
      this.channel = null;
    }
    if (this.chatChannel) {
      await this.chatChannel.unsubscribe();
      this.chatChannel = null;
    }
    this.activeEditors.clear();
  }
}

// localStorage-based history for offline/mock support

const EDIT_HISTORY_KEY = 'lifeos_edit_history';
const CHAT_HISTORY_KEY = 'lifeos_chat_history';

function saveEditToHistory(roomId: string, edit: CollaborativeEdit) {
  try {
    const key = `${EDIT_HISTORY_KEY}_${roomId}`;
    const history: CollaborativeEdit[] = JSON.parse(localStorage.getItem(key) || '[]');
    history.unshift(edit);
    // Keep last 200 edits
    localStorage.setItem(key, JSON.stringify(history.slice(0, 200)));
  } catch {
    // ignore
  }
}

function saveChatMessage(roomId: string, msg: ChatMessage) {
  try {
    const key = `${CHAT_HISTORY_KEY}_${roomId}`;
    const messages: ChatMessage[] = JSON.parse(localStorage.getItem(key) || '[]');
    messages.push(msg);
    // Keep last 500 messages
    localStorage.setItem(key, JSON.stringify(messages.slice(-500)));
  } catch {
    // ignore
  }
}

export function getEditHistory(
  roomId: string,
  resourceType?: string,
  resourceId?: string,
  limit = 50
): CollaborativeEdit[] {
  try {
    const key = `${EDIT_HISTORY_KEY}_${roomId}`;
    let history: CollaborativeEdit[] = JSON.parse(localStorage.getItem(key) || '[]');
    if (resourceType) {
      history = history.filter(e => e.resource_type === resourceType);
    }
    if (resourceId) {
      history = history.filter(e => e.resource_id === resourceId);
    }
    return history.slice(0, limit);
  } catch {
    return [];
  }
}

export function getChatHistory(roomId: string, limit = 100): ChatMessage[] {
  try {
    const key = `${CHAT_HISTORY_KEY}_${roomId}`;
    const messages: ChatMessage[] = JSON.parse(localStorage.getItem(key) || '[]');
    return messages.slice(-limit);
  } catch {
    return [];
  }
}

export function resolveConflicts(
  edits: CollaborativeEdit[]
): Record<string, any> {
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
