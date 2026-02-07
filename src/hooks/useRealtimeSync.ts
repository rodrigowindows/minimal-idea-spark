import { useEffect, useState, useCallback, useRef } from 'react';
import {
  CollaborationManager,
  type Presence,
  type CollaborativeEdit,
  type ChatMessage,
  type ActiveEditor,
  getChatHistory,
  getEditHistory,
} from '@/lib/realtime/collaboration';

export function useRealtimeSync(roomId: string, user: Presence) {
  const [manager, setManager] = useState<CollaborationManager | null>(null);
  const [presences, setPresences] = useState<Presence[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [activeEditors, setActiveEditors] = useState<ActiveEditor[]>([]);
  const [editHistory, setEditHistory] = useState<CollaborativeEdit[]>([]);
  const managerRef = useRef<CollaborationManager | null>(null);

  useEffect(() => {
    const collab = new CollaborationManager(roomId);
    managerRef.current = collab;

    // Load history from localStorage
    setChatMessages(getChatHistory(roomId));
    setEditHistory(getEditHistory(roomId));

    collab.join(user).then(() => {
      setManager(collab);
      setIsConnected(true);

      collab.onPresenceChange((p) => {
        setPresences(p);
      });

      collab.onChat((msg) => {
        setChatMessages(prev => [...prev, msg]);
      });

      collab.onActiveEditorsChange((editors) => {
        setActiveEditors(editors);
      });

      collab.onEdit((edit) => {
        setEditHistory(prev => [edit, ...prev].slice(0, 200));
      });
    });

    return () => {
      collab.leave();
      setIsConnected(false);
      managerRef.current = null;
    };
  }, [roomId, user.user_id]);

  const updatePresence = useCallback(
    (updates: Partial<Presence>) => {
      managerRef.current?.updatePresence(updates);
    },
    []
  );

  const sendEdit = useCallback(
    (edit: Omit<CollaborativeEdit, 'id' | 'timestamp'>) => {
      managerRef.current?.sendEdit(edit);
    },
    []
  );

  const onEdit = useCallback(
    (callback: (edit: CollaborativeEdit) => void) => {
      return managerRef.current?.onEdit(callback) || (() => {});
    },
    [manager]
  );

  const sendChatMessage = useCallback(
    (content: string) => {
      if (!managerRef.current) return;
      const msg = managerRef.current.sendChatMessage({
        workspace_id: roomId,
        user_id: user.user_id,
        username: user.username,
        avatar: user.avatar,
        content,
        type: 'message',
      });
      // Optimistically add to local state
      if (msg) {
        msg.then(m => {
          if (m) setChatMessages(prev => [...prev, m]);
        });
      }
    },
    [roomId, user.user_id, user.username, user.avatar]
  );

  const startEditing = useCallback(
    (resourceType: string, resourceId: string, field: string) => {
      managerRef.current?.startEditing({
        user_id: user.user_id,
        username: user.username,
        resource_type: resourceType,
        resource_id: resourceId,
        field,
      });
    },
    [user.user_id, user.username]
  );

  const stopEditing = useCallback(
    (resourceId: string, field: string) => {
      managerRef.current?.stopEditing({
        user_id: user.user_id,
        resource_id: resourceId,
        field,
      });
    },
    [user.user_id]
  );

  return {
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
  };
}

export function useCursorTracking(updatePresence: (updates: Partial<Presence>) => void) {
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      updatePresence({
        cursor: { x: e.clientX, y: e.clientY },
        last_seen: new Date().toISOString(),
      });
    };

    const throttledHandler = throttle(handleMouseMove, 50);
    window.addEventListener('mousemove', throttledHandler);

    return () => {
      window.removeEventListener('mousemove', throttledHandler);
    };
  }, [updatePresence]);
}

function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
}
