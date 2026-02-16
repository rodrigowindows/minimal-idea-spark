import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { PipelineStepView } from './PipelineProgress'

interface RetryConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  stepInfo?: PipelineStepView | null
  isRetrying: boolean
  onConfirm: () => void
}

export function RetryConfirmDialog({ open, onOpenChange, stepInfo, isRetrying, onConfirm }: RetryConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Retentar pipeline deste passo?</AlertDialogTitle>
          <AlertDialogDescription>
            O passo {stepInfo?.step} ({stepInfo?.provider} - {stepInfo?.role}) sera reprocessado.
            Isso criara uma copia do prompt e o colocara na fila de processamento.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRetrying}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isRetrying}>
            {isRetrying ? 'Retentando...' : 'Confirmar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
