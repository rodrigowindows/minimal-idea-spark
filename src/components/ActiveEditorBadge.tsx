import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Edit3 } from 'lucide-react';
import { useRealtime } from '@/contexts/RealtimeContext';
import { cn } from '@/lib/utils';

interface ActiveEditorBadgeProps {
  resourceId: string;
  field?: string;
  className?: string;
}

export function ActiveEditorBadge({ resourceId, field, className }: ActiveEditorBadgeProps) {
  const { activeEditors, currentUserId } = useRealtime();

  const editors = activeEditors.filter(e => {
    if (e.resource_id !== resourceId) return false;
    if (e.user_id === currentUserId) return false;
    if (field && e.field !== field) return false;
    return true;
  });

  if (editors.length === 0) return null;

  const editorNames = editors.map(e => e.username).join(', ');

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              'animate-pulse border-yellow-500 text-yellow-600 gap-1 text-xs',
              className
            )}
          >
            <Edit3 className="h-3 w-3" />
            {editors.length === 1 ? editors[0].username : `${editors.length} editando`}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{editorNames} {editors.length === 1 ? 'esta editando' : 'estao editando'}{field ? ` "${field}"` : ''}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
