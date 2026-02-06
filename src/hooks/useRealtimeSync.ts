import { useEffect, useState, useCallback } from 'react';
import { CollaborationManager, type Presence, type CollaborativeEdit } from '@/lib/realtime/collaboration';

export function useRealtimeSync(roomId: string, user: Presence) {
  const [manager, setManager] = useState<CollaborationManager | null>(null);
  const [presences, setPresences] = useState<Presence[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const collab = new CollaborationManager(roomId);

    collab.join(user).then(() => {
      setManager(collab);
      setIsConnected(true);

      collab.onPresenceChange((presences) => {
        setPresences(presences);
      });
    });

    return () => {
      collab.leave();
      setIsConnected(false);
    };
  }, [roomId, user.user_id]);

  const updatePresence = useCallback(
    (updates: Partial<Presence>) => {
      manager?.updatePresence(updates);
    },
    [manager]
  );

  const sendEdit = useCallback(
    (edit: Omit<CollaborativeEdit, 'id' | 'timestamp'>) => {
      manager?.sendEdit(edit);
    },
    [manager]
  );

  const onEdit = useCallback(
    (callback: (edit: CollaborativeEdit) => void) => {
      return manager?.onEdit(callback) || (() => {});
    },
    [manager]
  );

  return {
    presences,
    isConnected,
    updatePresence,
    sendEdit,
    onEdit,
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
