import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Building2,
  UserPlus,
  UserMinus,
  Share2,
  Settings2,
  Target,
  BookOpen,
  Shield,
  Link as LinkIcon,
  Activity,
} from 'lucide-react';
import { useWorkspaceContext } from '@/contexts/WorkspaceContext';
import type { ActivityAction } from '@/lib/db/schema-organizations';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const ACTION_CONFIG: Record<ActivityAction, { label: string; icon: typeof Activity; color: string }> = {
  'workspace.created': { label: 'Workspace criado', icon: Building2, color: 'text-blue-500' },
  'workspace.updated': { label: 'Workspace atualizado', icon: Settings2, color: 'text-blue-500' },
  'workspace.deleted': { label: 'Workspace removido', icon: Building2, color: 'text-red-500' },
  'member.invited': { label: 'Membro convidado', icon: UserPlus, color: 'text-green-500' },
  'member.joined': { label: 'Membro entrou', icon: UserPlus, color: 'text-green-500' },
  'member.removed': { label: 'Membro removido', icon: UserMinus, color: 'text-red-500' },
  'member.role_changed': { label: 'Permissao alterada', icon: Shield, color: 'text-yellow-500' },
  'dashboard.shared': { label: 'Dashboard compartilhado', icon: Share2, color: 'text-purple-500' },
  'dashboard.unshared': { label: 'Compartilhamento removido', icon: LinkIcon, color: 'text-red-500' },
  'opportunity.created': { label: 'Oportunidade criada', icon: Target, color: 'text-green-500' },
  'opportunity.updated': { label: 'Oportunidade atualizada', icon: Target, color: 'text-blue-500' },
  'opportunity.deleted': { label: 'Oportunidade removida', icon: Target, color: 'text-red-500' },
  'journal.created': { label: 'Entrada no diario', icon: BookOpen, color: 'text-emerald-500' },
  'settings.updated': { label: 'Configuracoes atualizadas', icon: Settings2, color: 'text-yellow-500' },
};

interface ActivityTimelineProps {
  limit?: number;
}

export function ActivityTimeline({ limit }: ActivityTimelineProps) {
  const { orgActivity } = useWorkspaceContext();

  const entries = limit ? orgActivity.slice(0, limit) : orgActivity;

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Nenhuma atividade registrada ainda</p>
      </div>
    );
  }

  return (
    <ScrollArea className={limit ? 'max-h-[300px]' : 'max-h-[600px]'}>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

        <div className="space-y-4">
          {entries.map((entry, index) => {
            const config = ACTION_CONFIG[entry.action] || {
              label: entry.action,
              icon: Activity,
              color: 'text-muted-foreground',
            };
            const Icon = config.icon;

            return (
              <div key={entry.id} className="relative flex gap-3 pl-2">
                {/* Icon dot */}
                <div
                  className={cn(
                    'relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-background border-2',
                    config.color === 'text-blue-500' && 'border-blue-500/30',
                    config.color === 'text-green-500' && 'border-green-500/30',
                    config.color === 'text-red-500' && 'border-red-500/30',
                    config.color === 'text-yellow-500' && 'border-yellow-500/30',
                    config.color === 'text-purple-500' && 'border-purple-500/30',
                    config.color === 'text-emerald-500' && 'border-emerald-500/30',
                  )}
                >
                  <Icon className={cn('h-3.5 w-3.5', config.color)} />
                </div>

                {/* Content */}
                <div className="flex-1 pb-2">
                  <p className="text-sm font-medium">{config.label}</p>
                  {entry.metadata && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatMetadata(entry.action, entry.metadata)}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}

function formatMetadata(action: ActivityAction, metadata: Record<string, unknown>): string {
  switch (action) {
    case 'workspace.created':
    case 'workspace.updated':
      return metadata.name ? `"${metadata.name}"` : '';
    case 'member.invited':
      return `${metadata.email || ''} como ${metadata.role || ''}`;
    case 'member.joined':
      return metadata.email ? `${metadata.email}` : '';
    case 'member.role_changed':
      return metadata.new_role ? `Nova permissao: ${metadata.new_role}` : '';
    case 'dashboard.shared':
      return `${metadata.dashboard_type || ''} (${metadata.share_type || ''})`;
    default:
      return '';
  }
}
