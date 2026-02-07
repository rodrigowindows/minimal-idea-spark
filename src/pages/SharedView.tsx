import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Eye,
  Edit3,
  MessageSquare,
  XCircle,
  Loader2,
  LayoutDashboard,
  BarChart3,
  Target,
  BookOpen,
  Share2,
  ArrowLeft,
} from 'lucide-react';
import { useWorkspaceContext } from '@/contexts/WorkspaceContext';
import type { SharedDashboard } from '@/lib/db/schema-organizations';

const DASHBOARD_ICONS: Record<string, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  analytics: BarChart3,
  opportunities: Target,
  journal: BookOpen,
};

export function SharedView() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { getSharedByToken } = useWorkspaceContext();
  const [share, setShare] = useState<SharedDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      const found = getSharedByToken(token);
      if (found) {
        setShare(found);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [token, getSharedByToken]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Carregando dashboard compartilhado...</p>
        </div>
      </div>
    );
  }

  if (notFound || !share) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md rounded-xl">
          <CardHeader className="text-center">
            <XCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
            <CardTitle>Link invalido ou expirado</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Este link de compartilhamento nao existe ou ja expirou.
            </p>
            <Button variant="outline" onClick={() => navigate('/')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const DashIcon = DASHBOARD_ICONS[share.dashboard_type] || LayoutDashboard;

  return (
    <div className="min-h-screen bg-background">
      {/* Shared view header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-lg font-semibold">{share.title}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="text-xs gap-1">
                  <Share2 className="h-3 w-3" />
                  Compartilhado
                </Badge>
                <Badge variant="secondary" className="text-xs gap-1">
                  <DashIcon className="h-3 w-3" />
                  {share.dashboard_type}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
      </header>

      {/* Shared content placeholder */}
      <main className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        <Card className="rounded-xl">
          <CardContent className="py-16 text-center">
            <DashIcon className="h-16 w-16 mx-auto text-primary/30 mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              Dashboard: {share.title}
            </h2>
            <p className="text-muted-foreground mb-4">
              Tipo: {share.dashboard_type} &middot;
              Acesso: {share.share_type === 'public' ? 'Publico' : share.share_type === 'organization' ? 'Organizacao' : 'Privado'}
            </p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Este e um dashboard compartilhado. Os dados serao exibidos aqui quando conectado ao Supabase.
              Suas permissoes: {share.permissions.can_edit ? 'Leitura e escrita' : 'Somente leitura'}.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
