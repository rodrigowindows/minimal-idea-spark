import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useWorkspaceContext } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';

export function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { acceptInvite, organizations } = useWorkspaceContext();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }

    const timer = setTimeout(() => {
      const accepted = acceptInvite(token);
      if (accepted) {
        setStatus('success');
        toast.success('Convite aceito com sucesso!');
      } else {
        setStatus('error');
      }
    }, 1500); // Simulate network delay

    return () => clearTimeout(timer);
  }, [token, acceptInvite]);

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
            {status === 'error' && 'Convite Invalido'}
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
                Voce agora faz parte do workspace. Clique abaixo para acessar.
              </p>
              <Button onClick={() => navigate('/')} className="w-full">
                Ir para o Dashboard
              </Button>
            </>
          )}
          {status === 'error' && (
            <>
              <XCircle className="h-16 w-16 mx-auto text-destructive" />
              <p className="text-muted-foreground">
                Este convite e invalido ou ja expirou. Solicite um novo convite ao administrador.
              </p>
              <Button variant="outline" onClick={() => navigate('/')} className="w-full">
                Voltar ao inicio
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
