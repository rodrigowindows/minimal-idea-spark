import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Share2,
  Plus,
  Copy,
  Trash2,
  Globe,
  Lock,
  Building2,
  Eye,
  Edit3,
  MessageSquare,
  ExternalLink,
  LayoutDashboard,
  BarChart3,
  Target,
  BookOpen,
} from 'lucide-react';
import { useWorkspaceContext } from '@/contexts/WorkspaceContext';
import type { ShareType, SharePermissions } from '@/lib/db/schema-organizations';
import { toast } from 'sonner';

const DASHBOARD_TYPES = [
  { value: 'dashboard', label: 'Dashboard Principal', icon: LayoutDashboard },
  { value: 'analytics', label: 'Analytics', icon: BarChart3 },
  { value: 'opportunities', label: 'Oportunidades', icon: Target },
  { value: 'journal', label: 'Diario', icon: BookOpen },
];

const SHARE_TYPE_CONFIG: Record<ShareType, { label: string; icon: typeof Globe; description: string }> = {
  public: { label: 'Publico', icon: Globe, description: 'Qualquer pessoa com o link pode acessar' },
  private: { label: 'Privado', icon: Lock, description: 'Apenas membros convidados' },
  organization: { label: 'Organizacao', icon: Building2, description: 'Todos os membros do workspace' },
};

export function ShareDashboard() {
  const {
    currentOrg,
    permissions,
    orgShares,
    shareDashboard,
    unshareDashboard,
  } = useWorkspaceContext();

  const [showCreate, setShowCreate] = useState(false);
  const [dashboardType, setDashboardType] = useState('dashboard');
  const [title, setTitle] = useState('');
  const [shareType, setShareType] = useState<ShareType>('organization');
  const [canEdit, setCanEdit] = useState(false);
  const [canComment, setCanComment] = useState(true);

  if (!currentOrg) return null;

  const handleCreate = () => {
    if (!title.trim()) {
      toast.error('Titulo e obrigatorio');
      return;
    }
    const perms: SharePermissions = {
      can_view: true,
      can_edit: canEdit,
      can_comment: canComment,
      can_share: false,
    };
    const share = shareDashboard(dashboardType, title.trim(), shareType, perms);
    if (share) {
      toast.success('Dashboard compartilhado com sucesso!');
      if (share.share_token) {
        const link = `${window.location.origin}/shared/${share.share_token}`;
        navigator.clipboard.writeText(link);
        toast.success('Link copiado para a area de transferencia');
      }
      setTitle('');
      setShowCreate(false);
    }
  };

  const handleCopyLink = (token: string) => {
    const link = `${window.location.origin}/shared/${token}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copiado!');
  };

  const handleDelete = (shareId: string) => {
    unshareDashboard(shareId);
    toast.success('Compartilhamento removido');
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" />
              Dashboards Compartilhados
            </span>
            {permissions.canShareDashboards && (
              <Button size="sm" className="gap-2" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4" />
                Compartilhar
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orgShares.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Share2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhum dashboard compartilhado ainda</p>
              {permissions.canShareDashboards && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setShowCreate(true)}
                >
                  Compartilhar primeiro dashboard
                </Button>
              )}
            </div>
          ) : (
            <ScrollArea className="max-h-[500px]">
              <div className="space-y-3">
                {orgShares.map((share) => {
                  const typeConfig = SHARE_TYPE_CONFIG[share.share_type];
                  const TypeIcon = typeConfig.icon;
                  const dashType = DASHBOARD_TYPES.find(d => d.value === share.dashboard_type);
                  const DashIcon = dashType?.icon || LayoutDashboard;
                  return (
                    <div
                      key={share.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <DashIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{share.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-xs gap-1">
                              <TypeIcon className="h-3 w-3" />
                              {typeConfig.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {dashType?.label || share.dashboard_type}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            {share.permissions.can_view && (
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" /> Visualizar
                              </span>
                            )}
                            {share.permissions.can_edit && (
                              <span className="flex items-center gap-1">
                                <Edit3 className="h-3 w-3" /> Editar
                              </span>
                            )}
                            {share.permissions.can_comment && (
                              <span className="flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" /> Comentar
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {share.share_token && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleCopyLink(share.share_token!)}
                            title="Copiar link"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        )}
                        {permissions.canShareDashboards && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDelete(share.id)}
                            title="Remover"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Create Share Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Compartilhar Dashboard
            </DialogTitle>
            <DialogDescription>
              Crie um link de compartilhamento para um dashboard
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); handleCreate(); }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Titulo</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Dashboard Q1 2026"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Dashboard</Label>
              <Select value={dashboardType} onValueChange={setDashboardType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DASHBOARD_TYPES.map(dt => (
                    <SelectItem key={dt.value} value={dt.value}>
                      <span className="flex items-center gap-2">
                        <dt.icon className="h-4 w-4" />
                        {dt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Acesso</Label>
              <Select value={shareType} onValueChange={(v) => setShareType(v as ShareType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SHARE_TYPE_CONFIG).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {config.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {SHARE_TYPE_CONFIG[shareType].description}
              </p>
            </div>
            <div className="space-y-3">
              <Label>Permissoes</Label>
              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-2.5">
                <div>
                  <p className="text-sm">Permitir edicao</p>
                  <p className="text-xs text-muted-foreground">Membros podem editar dados</p>
                </div>
                <Switch checked={canEdit} onCheckedChange={setCanEdit} />
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-2.5">
                <div>
                  <p className="text-sm">Permitir comentarios</p>
                  <p className="text-xs text-muted-foreground">Membros podem comentar</p>
                </div>
                <Switch checked={canComment} onCheckedChange={setCanComment} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!title.trim()}>
                Compartilhar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
