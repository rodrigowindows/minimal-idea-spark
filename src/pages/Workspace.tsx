import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Building2,
  Users,
  Settings2,
  Activity,
  Share2,
  Trash2,
  Edit3,
  Clock,
  LayoutDashboard,
  MessageSquare,
  History,
  Circle,
} from 'lucide-react';
import { useWorkspaceContext } from '@/contexts/WorkspaceContext';
import { useRealtime } from '@/contexts/RealtimeContext';
import { InviteMembers } from '@/components/InviteMembers';
import { ShareDashboard } from '@/components/ShareDashboard';
import { ActivityTimeline } from '@/components/ActivityTimeline';
import { RealtimeChat } from '@/components/RealtimeChat';
import { ChangeHistory } from '@/components/ChangeHistory';
import { PresenceIndicator } from '@/components/PresenceIndicator';
import { ROLE_LABELS } from '@/lib/db/schema-organizations';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

export function Workspace() {
  const { user } = useAuth();
  const currentUserId = user?.id ?? 'mock-user-001';
  const {
    currentOrg,
    currentRole,
    permissions,
    orgMembers,
    orgShares,
    orgActivity,
    updateOrganization,
    deleteOrganization,
    organizations,
  } = useWorkspaceContext();
  const { presences, isConnected, chatMessages } = useRealtime();

  const [editName, setEditName] = useState('');
  const [showEditDialog, setShowEditDialog] = useState(false);

  if (!currentOrg) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Nenhum workspace selecionado</p>
      </div>
    );
  }

  const handleSaveName = () => {
    if (!editName.trim()) return;
    updateOrganization(currentOrg.id, { name: editName.trim() });
    toast.success('Nome do workspace atualizado');
    setShowEditDialog(false);
  };

  const handleDelete = () => {
    if (organizations.length <= 1) {
      toast.error('Voce precisa ter pelo menos um workspace');
      return;
    }
    deleteOrganization(currentOrg.id);
    toast.success('Workspace removido');
  };

  const onlineCount = presences.length;

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{currentOrg.name}</h1>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                {ROLE_LABELS[currentRole]} &middot; {orgMembers.length} membro{orgMembers.length > 1 ? 's' : ''}
                <span className="flex items-center gap-1">
                  <Circle className={cn('h-2 w-2 fill-current', isConnected ? 'text-green-500' : 'text-red-500')} />
                  {onlineCount > 0 ? `${onlineCount} online` : 'Offline'}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PresenceIndicator
              presences={presences}
              currentUserId={currentUserId}
              maxDisplay={5}
            />
            <InviteMembers />
            {permissions.canEditSettings && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => {
                  setEditName(currentOrg.name);
                  setShowEditDialog(true);
                }}
              >
                <Edit3 className="h-4 w-4" />
                Editar
              </Button>
            )}
          </div>
        </div>
      </header>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Visao Geral
          </TabsTrigger>
          <TabsTrigger value="chat" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Chat
            {chatMessages.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] text-xs">
                {chatMessages.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-2">
            <Users className="h-4 w-4" />
            Membros
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Historico
          </TabsTrigger>
          <TabsTrigger value="sharing" className="gap-2">
            <Share2 className="h-4 w-4" />
            Compartilhamento
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <Activity className="h-4 w-4" />
            Atividade
          </TabsTrigger>
          {permissions.canEditSettings && (
            <TabsTrigger value="settings" className="gap-2">
              <Settings2 className="h-4 w-4" />
              Config
            </TabsTrigger>
          )}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="rounded-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Membros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <span className="text-2xl font-bold">{orgMembers.length}</span>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Online Agora</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Circle className="h-5 w-5 text-green-500 fill-green-500" />
                  <span className="text-2xl font-bold">{onlineCount}</span>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Dashboards Compartilhados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Share2 className="h-5 w-5 text-blue-500" />
                  <span className="text-2xl font-bold">{orgShares.length}</span>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Sua Permissao</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{ROLE_LABELS[currentRole]}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent activity preview */}
          <Card className="rounded-xl mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5 text-primary" />
                Atividades Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityTimeline limit={5} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chat Tab */}
        <TabsContent value="chat">
          <RealtimeChat />
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members">
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Membros do Workspace
                </span>
                <InviteMembers />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {orgMembers.map((member) => {
                  const isOnline = presences.some(p => p.user_id === member.user_id);
                  const presence = presences.find(p => p.user_id === member.user_id);
                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                            {(member.user_profile?.full_name || member.user_id)?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div className={cn(
                            'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background',
                            isOnline ? 'bg-green-500' : 'bg-gray-400'
                          )} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {member.user_profile?.full_name || member.user_id}
                            {member.user_id === currentUserId && (
                              <span className="ml-2 text-xs text-muted-foreground">(voce)</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {isOnline && presence?.current_page ? (
                              <span className="text-green-600">Vendo: {presence.current_page}</span>
                            ) : (
                              <>Desde {formatDistanceToNow(new Date(member.joined_at), { addSuffix: true })}</>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isOnline && (
                          <Badge variant="outline" className="text-green-600 border-green-300 text-xs">
                            Online
                          </Badge>
                        )}
                        <Badge variant="secondary">{ROLE_LABELS[member.role]}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <ChangeHistory />
        </TabsContent>

        {/* Sharing Tab */}
        <TabsContent value="sharing">
          <ShareDashboard />
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5 text-primary" />
                Log de Atividades
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityTimeline />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        {permissions.canEditSettings && (
          <TabsContent value="settings">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Settings2 className="h-5 w-5 text-primary" />
                    Configuracoes do Workspace
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <div className="flex gap-2">
                      <Input value={currentOrg.name} disabled />
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditName(currentOrg.name);
                          setShowEditDialog(true);
                        }}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Slug</Label>
                    <Input value={currentOrg.slug} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Criado em</Label>
                    <Input
                      value={new Date(currentOrg.created_at).toLocaleDateString('pt-BR')}
                      disabled
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-xl border-destructive/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-destructive">
                    <Trash2 className="h-5 w-5" />
                    Zona de Perigo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Ao deletar este workspace, todos os dados compartilhados, convites e logs de atividade serao removidos permanentemente.
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        className="w-full gap-2"
                        disabled={organizations.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                        Deletar Workspace
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acao ira deletar permanentemente o workspace "{currentOrg.name}" e todos os dados associados.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>
                          Deletar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  {organizations.length <= 1 && (
                    <p className="text-xs text-muted-foreground">
                      Voce precisa ter pelo menos um workspace.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Edit Name Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Workspace</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleSaveName(); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nome do workspace"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!editName.trim()}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
