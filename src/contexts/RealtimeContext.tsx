import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useRealtimeSync, useCursorTracking } from '@/hooks/useRealtimeSync';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceContext } from '@/contexts/WorkspaceContext';
import type { Presence, CollaborativeEdit, ChatMessage, ActiveEditor } from '@/lib/realtime/collaboration';
import { useLocation } from 'react-router-dom';

/**
 * Realtime collaboration: presences, cursors, collaborative edits, chat by workspace, active editors.
 * Uses Supabase Realtime and useRealtimeSync; room is derived from current workspace.
 */
interface RealtimeContextValue {
  presences: Presence[];
  isConnected: boolean;
  updatePresence: (updates: Partial<Presence>) => void;
  sendEdit: (edit: Omit<CollaborativeEdit, 'id' | 'timestamp'>) => void;
  onEdit: (callback: (edit: CollaborativeEdit) => void) => () => void;
  chatMessages: ChatMessage[];
  sendChatMessage: (content: string) => void;
  activeEditors: ActiveEditor[];
  startEditing: (resourceType: string, resourceId: string, field: string) => void;
  stopEditing: (resourceId: string, field: string) => void;
  editHistory: CollaborativeEdit[];
  currentUserId: string;
  currentUsername: string;
}

const RealtimeContext = createContext<RealtimeContextValue | undefined>(undefined);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { currentOrg } = useWorkspaceContext();
  const location = useLocation();

  const currentUserId = user?.id ?? 'mock-user-001';
  const currentUsername = user?.user_metadata?.full_name || (user?.email ? user.email.split('@')[0] : 'Usuario');

  const roomId = currentOrg?.id ?? 'default-room';

  const presenceUser = useMemo<Presence>(() => ({
    user_id: currentUserId,
    username: currentUsername,
    current_page: location.pathname,
    last_seen: new Date().toISOString(),
  }), [currentUserId, currentUsername]);

  const {
    presences,
    isConnected,
    updatePresence,
    sendEdit,
    onEdit,
    chatMessages,
    sendChatMessage,
    activeEditors,
    startEditing,
    stopEditing,
    editHistory,
  } = useRealtimeSync(roomId, presenceUser);

  // Cursor tracking disabled — was causing ~20 re-renders/sec via Supabase presence echo
  // useCursorTracking(updatePresence);

  // Update presence when page changes (useEffect, not useMemo — this is a side effect)
  // Removed: was adding latency on every navigation by calling Supabase Realtime track()
  // useEffect(() => {
  //   if (isConnected) updatePresence({ current_page: location.pathname });
  // }, [location.pathname, isConnected]);

  const value = useMemo<RealtimeContextValue>(() => ({
    presences,
    isConnected,
    updatePresence,
    sendEdit,
    onEdit,
    chatMessages,
    sendChatMessage,
    activeEditors,
    startEditing,
    stopEditing,
    editHistory,
    currentUserId,
    currentUsername,
  }), [
    presences, isConnected, updatePresence, sendEdit, onEdit,
    chatMessages, sendChatMessage, activeEditors, startEditing,
    stopEditing, editHistory, currentUserId, currentUsername,
  ]);

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime(): RealtimeContextValue {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}
