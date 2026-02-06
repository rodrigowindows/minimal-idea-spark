import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Presence } from '@/lib/realtime/collaboration';

interface CollaborativeCursorProps {
  presences: Presence[];
  currentUserId: string;
}

export function CollaborativeCursor({ presences, currentUserId }: CollaborativeCursorProps) {
  const [cursors, setCursors] = useState<Presence[]>([]);

  useEffect(() => {
    const otherUsers = presences.filter(p => p.user_id !== currentUserId && p.cursor);
    setCursors(otherUsers);
  }, [presences, currentUserId]);

  const getColor = (userId: string) => {
    const colors = [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
      '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
    ];
    const index = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  return (
    <AnimatePresence>
      {cursors.map((presence) => {
        if (!presence.cursor) return null;

        const color = getColor(presence.user_id);

        return (
          <motion.div
            key={presence.user_id}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            style={{
              position: 'fixed',
              left: presence.cursor.x,
              top: presence.cursor.y,
              pointerEvents: 'none',
              zIndex: 9999,
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M5.65376 12.3673L8.47526 15.1888L12.5701 19.2836C13.6134 20.3269 15.2736 19.5909 15.2736 18.0881V11.9976L21.4536 5.81759C22.0819 5.18927 21.6419 4.11206 20.7416 4.11206H4.94356C3.43086 4.11206 2.69486 5.77231 3.73816 6.81561L5.65376 8.73121"
                fill={color}
              />
            </svg>
            <div
              className="ml-4 mt-1 px-2 py-1 rounded text-white text-xs whitespace-nowrap"
              style={{ backgroundColor: color }}
            >
              {presence.username}
            </div>
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
}
