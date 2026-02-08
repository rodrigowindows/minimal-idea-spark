import { ShieldOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'

export function Unauthorized() {
  const navigate = useNavigate()
  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center"
      role="alert"
    >
      <ShieldOff className="h-16 w-16 text-muted-foreground" aria-hidden />
      <h1 className="text-2xl font-semibold text-foreground">Acesso negado</h1>
      <p className="max-w-md text-muted-foreground">
        Você não tem permissão para acessar este recurso.
      </p>
      <Button onClick={() => navigate('/')} variant="outline">
        Voltar ao início
      </Button>
    </div>
  )
}
