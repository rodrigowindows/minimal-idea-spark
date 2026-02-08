import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Sparkles } from 'lucide-react'

const WELCOME_DISMISSED_KEY = 'lifeos_welcome_dismissed'

export function WelcomeModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem(WELCOME_DISMISSED_KEY)
    if (!dismissed) setOpen(true)
  }, [])

  const handleClose = (dontShowAgain: boolean) => {
    if (dontShowAgain) localStorage.setItem(WELCOME_DISMISSED_KEY, '1')
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose(false)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Bem-vindo ao Canvas
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Capture ideias no War Room, converse com o Consultor, organize Oportunidades e use o Diário.
          Pressione <kbd className="rounded border bg-muted px-1">?</kbd> para ver atalhos de teclado.
        </p>
        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              id="dont-show"
              onCheckedChange={(checked) => {
                if (checked) handleClose(true)
              }}
            />
            <span>Não mostrar novamente</span>
          </label>
          <Button onClick={() => handleClose(false)}>Continuar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
