import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  UserPlus,
  Copy,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  Shield,
  Ban,
} from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspaceContext } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_LABELS, type InviteRole, type InviteStatus } from '@/lib/db/schema-organizations';
import { formatDistanceToNow } from 'date-fns';

const STATUS_CONFIG: Record<InviteStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Clock }> = {
  pending: { label: 'Pendente', variant: 'outline', icon: Clock },
  accepted: { label: 'Aceito', variant: 'default', icon: CheckCircle2 },
  expired: { label: 'Expirado', variant: 'destructive', icon: XCircle },
  revoked: { label: 'Revogado', variant: 'destructive', icon: Ban },
};

export function InviteMembers() {
  const {
    currentOrg,
    permissions,
    orgInvites,
    orgMembers,
    inviteMember,
    revokeInvite,
    removeMember,
    changeMemberRole,
  } = useWorkspaceContext();

  const { user } = useAuth();
  const currentUserId = user?.id ?? 'mock-user-001';

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InviteRole>('editor');

  if (!currentOrg) return null;

  const handleSendInvite = () => {
    if (!email.trim()) {
      toast.error('Email e obrigatorio');
      return;
    }
    const existing = orgInvites.find(i => i.email === email && i.status === 'pending');
    if (existing) {
      toast.error('Ja existe um convite pendente para este email');
      return;
    }

    const invite = inviteMember(email.trim(), role);
    if (invite) {
      toast.success(`Convite enviado para ${email}`);
      setEmail('');
    }
  };

  const handleCopyLink = (token: string) => {
    const link = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(link);
    toast.success('Link de convite copiado!');
  };

  const pendingInvites = orgInvites.filter(i => i.status === 'pending');
  const allInvites = orgInvites;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={!permissions.canInvite} size="sm" className="gap-2">
          <UserPlus className="h-4 w-4" />
          Convidar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Gerenciar Membros - {currentOrg.name}
          </DialogTitle>
          <DialogDescription>
            Convide pessoas por email e gerencie permissoes do workspace
          </DialogDescription>
        </DialogHeader>

        {/* Invite form */}
        {permissions.canInvite && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="email"
                  placeholder="usuario@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendInvite()}
                />
              </div>
              <Select value={role} onValueChange={(v) => setRole(v as InviteRole)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Visualizador</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleSendInvite}>Enviar</Button>
            </div>
            <p className="text-xs text-muted-foreground">
              O convite expira em 7 dias. Voce pode revogar a qualquer momento.
            </p>
          </div>
        )}

        <Separator />

        {/* Current members */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Membros ({orgMembers.length})
          </h4>
          <ScrollArea className="max-h-[200px]">
            <div className="space-y-2">
              {orgMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-lg bg-muted/50 p-2.5"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                      {(member.user_profile?.full_name || member.user_id)?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {member.user_profile?.full_name || member.user_id}
                        {member.user_id === currentUserId && (
                          <span className="ml-1 text-xs text-muted-foreground">(voce)</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ROLE_LABELS[member.role]}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {permissions.canRemoveMembers && member.role !== 'owner' && member.user_id !== currentUserId && (
                      <>
                        <Select
                          value={member.role}
                          onValueChange={(v) => changeMemberRole(member.id, v as InviteRole)}
                        >
                          <SelectTrigger className="h-7 w-[100px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="viewer">Viewer</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => removeMember(member.id)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                    {member.role === 'owner' && (
                      <Badge variant="secondary" className="text-xs">Owner</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* All invites with status */}
        {allInvites.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium">
                Convites ({pendingInvites.length} pendente{pendingInvites.length !== 1 ? 's' : ''} / {allInvites.length} total)
              </h4>
              <ScrollArea className="max-h-[200px]">
                <div className="space-y-2">
                  {allInvites.map((invite) => {
                    const config = STATUS_CONFIG[invite.status];
                    const StatusIcon = config.icon;
                    const isExpired = new Date(invite.expires_at) < new Date();
                    const effectiveStatus = invite.status === 'pending' && isExpired ? 'expired' : invite.status;
                    const effectiveConfig = STATUS_CONFIG[effectiveStatus];
                    const EffectiveIcon = effectiveConfig.icon;

                    return (
                      <div
                        key={invite.id}
                        className="flex items-center justify-between rounded-lg bg-muted/50 p-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm truncate">{invite.email}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <Badge variant={effectiveConfig.variant} className="text-xs gap-1">
                              <EffectiveIcon className="h-3 w-3" />
                              {effectiveConfig.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {ROLE_LABELS[invite.role]}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {invite.status === 'pending' && !isExpired && (
                              <>Expira {formatDistanceToNow(new Date(invite.expires_at), { addSuffix: true })}</>
                            )}
                            {invite.status === 'accepted' && invite.accepted_at && (
                              <>Aceito {formatDistanceToNow(new Date(invite.accepted_at), { addSuffix: true })}</>
                            )}
                            {invite.status === 'revoked' && invite.revoked_at && (
                              <>Revogado {formatDistanceToNow(new Date(invite.revoked_at), { addSuffix: true })}</>
                            )}
                            {(invite.status === 'expired' || (invite.status === 'pending' && isExpired)) && (
                              <>Expirou {formatDistanceToNow(new Date(invite.expires_at), { addSuffix: true })}</>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {invite.status === 'pending' && !isExpired && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleCopyLink(invite.token)}
                              title="Copiar link"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {permissions.canInvite && invite.status === 'pending' && !isExpired && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => revokeInvite(invite.id)}
                              title="Revogar convite"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
