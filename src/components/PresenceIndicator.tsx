import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { Presence } from '@/lib/realtime/collaboration';

interface PresenceIndicatorProps {
  presences: Presence[];
  currentUserId: string;
  maxDisplay?: number;
}

const PAGE_LABELS: Record<string, string> = {
  '/': 'Dashboard',
  '/consultant': 'Consultor',
  '/opportunities': 'Oportunidades',
  '/journal': 'Diario',
  '/analytics': 'Analiticas',
  '/habits': 'Habitos',
  '/goals': 'Metas',
  '/calendar': 'Calendario',
  '/priorities': 'Prioridades',
  '/weekly-review': 'Revisao Semanal',
  '/settings': 'Config',
  '/workspace': 'Workspace',
};

export function PresenceIndicator({
  presences,
  currentUserId,
  maxDisplay = 5
}: PresenceIndicatorProps) {
  const otherUsers = presences.filter(p => p.user_id !== currentUserId);
  const displayUsers = otherUsers.slice(0, maxDisplay);
  const remainingCount = otherUsers.length - maxDisplay;

  if (otherUsers.length === 0) {
    return null;
  }

  const getInitials = (username: string) => {
    return username
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getColor = (userId: string) => {
    const colors = [
      'bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500',
      'bg-pink-500', 'bg-cyan-500', 'bg-lime-500', 'bg-orange-500', 'bg-indigo-500'
    ];
    const index = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        <span className="text-sm text-muted-foreground mr-2">Online:</span>
        <div className="flex -space-x-2">
          {displayUsers.map((presence) => (
            <Tooltip key={presence.user_id}>
              <TooltipTrigger>
                <div className="relative">
                  <Avatar className="h-8 w-8 border-2 border-background">
                    <AvatarImage src={presence.avatar} />
                    <AvatarFallback className={cn('text-white text-xs', getColor(presence.user_id))}>
                      {getInitials(presence.username)}
                    </AvatarFallback>
                  </Avatar>
                  {/* Online dot */}
                  <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
                  {/* Editing indicator */}
                  {presence.is_editing && (
                    <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-yellow-500 border border-background animate-pulse" />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">{presence.username}</p>
                {presence.current_page && (
                  <p className="text-xs text-muted-foreground">
                    Vendo: {PAGE_LABELS[presence.current_page] || presence.current_page}
                  </p>
                )}
                {presence.is_editing && (
                  <p className="text-xs text-yellow-500">
                    Editando...
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          ))}
          {remainingCount > 0 && (
            <Tooltip>
              <TooltipTrigger>
                <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                  +{remainingCount}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{remainingCount} mais usuario{remainingCount > 1 ? 's' : ''} online</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
