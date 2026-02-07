import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { History, FileEdit, Trash2, Plus } from 'lucide-react';
import { useRealtime } from '@/contexts/RealtimeContext';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { CollaborativeEdit } from '@/lib/realtime/collaboration';

interface ChangeHistoryProps {
  resourceType?: string;
  resourceId?: string;
  limit?: number;
}

export function ChangeHistory({ resourceType, resourceId, limit = 50 }: ChangeHistoryProps) {
  const { editHistory, currentUserId } = useRealtime();

  let filteredHistory = editHistory;
  if (resourceType) {
    filteredHistory = filteredHistory.filter(e => e.resource_type === resourceType);
  }
  if (resourceId) {
    filteredHistory = filteredHistory.filter(e => e.resource_id === resourceId);
  }
  filteredHistory = filteredHistory.slice(0, limit);

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

  const getActionIcon = (edit: CollaborativeEdit) => {
    if (edit.old_value === undefined || edit.old_value === null) {
      return <Plus className="h-3 w-3 text-green-500" />;
    }
    if (edit.value === undefined || edit.value === null) {
      return <Trash2 className="h-3 w-3 text-red-500" />;
    }
    return <FileEdit className="h-3 w-3 text-blue-500" />;
  };

  const getActionLabel = (edit: CollaborativeEdit) => {
    if (edit.old_value === undefined || edit.old_value === null) {
      return 'adicionou';
    }
    if (edit.value === undefined || edit.value === null) {
      return 'removeu';
    }
    return 'editou';
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'string') return value.length > 40 ? value.slice(0, 40) + '...' : value;
    if (typeof value === 'object') return JSON.stringify(value).slice(0, 40) + '...';
    return String(value);
  };

  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="h-5 w-5 text-primary" />
          Historico de Alteracoes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <History className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm">Nenhuma alteracao registrada</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

              <div className="space-y-4">
                {filteredHistory.map((edit) => {
                  const isOwn = edit.user_id === currentUserId;
                  return (
                    <div key={edit.id} className="flex gap-3 relative">
                      <Avatar className="h-8 w-8 shrink-0 z-10 border-2 border-background">
                        <AvatarFallback className={cn('text-white text-xs', getColor(edit.user_id))}>
                          {getInitials(edit.username || 'U')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">
                            {isOwn ? 'Voce' : (edit.username || 'Usuario')}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {getActionLabel(edit)}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {edit.resource_type}
                          </Badge>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            {getActionIcon(edit)}
                            {edit.field}
                          </span>
                        </div>
                        {edit.value !== undefined && edit.value !== null && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {formatValue(edit.value)}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(edit.timestamp), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
