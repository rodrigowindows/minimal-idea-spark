import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, CheckCircle2, XCircle, Loader2, Clock, Ban, AlertTriangle } from 'lucide-react';
import { useWorkspaceContext } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';

type InvitePageStatus = 'loading' | 'success' | 'not_found' | 'expired' | 'revoked' | 'already_used';

const ERROR_CONFIG: Record<Exclude<InvitePageStatus, 'loading' | 'success'>, {
  title: string;
  message: string;
  icon: typeof XCircle;
  iconColor: string;
}> = {
  not_found: {
    title: 'Convite Nao Encontrado',
    message: 'Este link de convite nao existe ou e invalido. Verifique o link ou solicite um novo convite ao administrador.',
    icon: XCircle,
    iconColor: 'text-destructive',
  },
  expired: {
    title: 'Convite Expirado',
    message: 'Este convite expirou (validade de 7 dias). Solicite ao administrador do workspace que envie um novo convite.',
    icon: Clock,
    iconColor: 'text-amber-500',
  },
  revoked: {
    title: 'Convite Revogado',
    message: 'Este convite foi revogado pelo administrador do workspace. Solicite um novo convite se necessario.',
    icon: Ban,
    iconColor: 'text-destructive',
  },
  already_used: {
    title: 'Convite Ja Utilizado',
    message: 'Este convite ja foi aceito anteriormente. Se voce ja e membro, faca login para acessar o workspace.',
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
  },
};

export function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { validateInviteToken, acceptInvite } = useWorkspaceContext();
  const [status, setStatus] = useState<InvitePageStatus>('loading');
  const [orgName, setOrgName] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setStatus('not_found');
      return;
    }

    const timer = setTimeout(() => {
      const validation = validateInviteToken(token);

      if (!validation.valid) {
        setStatus(validation.reason as Exclude<InvitePageStatus, 'loading' | 'success'>);
        return;
      }

      if (validation.organizationName) {
        setOrgName(validation.organizationName);
      }

      const accepted = acceptInvite(token);
      if (accepted) {
        setStatus('success');
        toast.success('Convite aceito com sucesso!');
      } else {
        setStatus('not_found');
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [token, acceptInvite, validateInviteToken]);

  const errorConfig = status !== 'loading' && status !== 'success' ? ERROR_CONFIG[status] : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md rounded-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Sparkles className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-xl">
            {status === 'loading' && 'Processando convite...'}
            {status === 'success' && 'Convite Aceito!'}
            {errorConfig && errorConfig.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === 'loading' && (
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          {status === 'success' && (
            <>
              <CheckCircle2 className="h-16 w-16 mx-auto text-green-500" />
              <p className="text-muted-foreground">
                {orgName
                  ? `Voce agora faz parte do workspace "${orgName}". Clique abaixo para acessar.`
                  : 'Voce agora faz parte do workspace. Clique abaixo para acessar.'}
              </p>
              <Button onClick={() => navigate('/')} className="w-full">
                Ir para o Dashboard
              </Button>
            </>
          )}
          {errorConfig && (() => {
            const Icon = errorConfig.icon;
            return (
              <>
                <Icon className={`h-16 w-16 mx-auto ${errorConfig.iconColor}`} />
                <p className="text-muted-foreground">
                  {errorConfig.message}
                </p>
                <div className="flex flex-col gap-2">
                  <Button variant="outline" onClick={() => navigate('/auth')} className="w-full">
                    Fazer Login
                  </Button>
                  <Button variant="ghost" onClick={() => navigate('/')} className="w-full">
                    Voltar ao inicio
                  </Button>
                </div>
              </>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}
