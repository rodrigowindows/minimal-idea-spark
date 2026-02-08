import { Cloud, CloudOff, Loader2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { cn } from '@/lib/utils';

interface SyncStatusIndicatorProps {
  className?: string;
  showBar?: boolean;
}

export function SyncStatusIndicator({ className, showBar = false }: SyncStatusIndicatorProps) {
  const { status, pendingCount, lastError, syncing, clearPendingQueue } = useSyncStatus();

  const label =
    status === 'offline'
      ? 'Offline'
      : status === 'syncing'
        ? pendingCount > 0
          ? `Sincronizando ${pendingCount} itens...`
          : 'Sincronizando...'
        : pendingCount > 0
          ? `${pendingCount} pendente(s)`
          : 'Online';

  const icon =
    status === 'offline' ? (
      <CloudOff className="h-4 w-4 text-muted-foreground" />
    ) : status === 'syncing' ? (
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
    ) : (
      <Cloud className="h-4 w-4 text-muted-foreground" />
    );

  const content = (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs',
              status === 'offline' && 'text-amber-600 dark:text-amber-400',
              status === 'syncing' && 'text-primary',
              status === 'online' && pendingCount > 0 && 'text-muted-foreground',
              className
            )}
            aria-label={label}
          >
            {icon}
            {showBar && <span className="hidden sm:inline">{label}</span>}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p>{label}</p>
          {lastError && <p className="mt-1 text-destructive text-xs">{lastError}</p>}
          {pendingCount > 0 && !syncing && (
            <button
              type="button"
              className="mt-2 text-xs underline text-muted-foreground hover:text-foreground"
              onClick={() => clearPendingQueue()}
            >
              Limpar fila
            </button>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  if (showBar && (status === 'syncing' || pendingCount > 0)) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/30 px-3 py-1.5 text-sm">
          {icon}
          <span>
            {syncing ? `Sincronizando ${pendingCount} itens...` : `${pendingCount} na fila`}
          </span>
        </div>
      </div>
    );
  }

  return content;
}
