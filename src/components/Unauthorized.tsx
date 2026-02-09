import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

interface UnauthorizedProps {
  message?: string;
  action?: string;
}

export function Unauthorized({
  message = 'Voce nao tem permissao para acessar este recurso. Entre em contato com o administrador do workspace.',
  action,
}: UnauthorizedProps) {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <ShieldAlert className="h-16 w-16 text-destructive" />
          </div>
          <CardTitle className="text-xl">Acesso Negado (403)</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">{message}</p>
          {action && (
            <p className="text-sm text-muted-foreground">
              Acao necessaria: <span className="font-medium text-foreground">{action}</span>
            </p>
          )}
          <div className="flex flex-col gap-2">
            <Button onClick={() => navigate('/')} className="w-full">
              Voltar ao Dashboard
            </Button>
            <Button variant="outline" onClick={() => navigate(-1)} className="w-full">
              Voltar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
