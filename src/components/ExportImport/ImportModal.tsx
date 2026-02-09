import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { validateBackupFile, restoreFromJson, type RestoreStrategy } from '@/lib/export/restore'
import { Upload } from 'lucide-react'

interface ImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function ImportModal({ open, onOpenChange, onSuccess }: ImportModalProps) {
  const [strategy, setStrategy] = useState<RestoreStrategy>('merge')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ keys: string[]; exportedAt?: string } | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    setFile(f ?? null)
    setError(null)
    setPreview(null)
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result as string
      const validated = validateBackupFile(text)
      if (validated.ok) {
        setPreview({
          keys: Object.keys(validated.payload.data),
          exportedAt: validated.payload.exportedAt,
        })
      } else {
        setError((validated as { ok: false; error: string }).error)
      }
    }
    reader.readAsText(f)
  }

  const handleImport = () => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = restoreFromJson(reader.result as string, strategy)
      if (result.ok) {
        onSuccess?.()
        onOpenChange(false)
        setFile(null)
        setPreview(null)
        window.dispatchEvent(new Event('storage'))
      } else {
        setError(result.error ?? 'Falha ao restaurar.')
      }
    }
    reader.readAsText(file)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Restaurar backup</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Arquivo JSON de backup</Label>
            <input
              type="file"
              accept=".json"
              className="mt-2 block w-full text-sm text-muted-foreground file:mr-2 file:rounded file:border file:px-4 file:py-2 file:text-sm"
              onChange={handleFileChange}
            />
          </div>
          {preview && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <p>Chaves no backup: {preview.keys.join(', ')}</p>
              {preview.exportedAt && (
                <p className="mt-1 text-muted-foreground">
                  Exportado em: {new Date(preview.exportedAt).toLocaleString()}
                </p>
              )}
            </div>
          )}
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <div>
            <Label>Em caso de conflito</Label>
            <RadioGroup
              value={strategy}
              onValueChange={(v) => setStrategy(v as RestoreStrategy)}
              className="mt-2 space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="merge" id="strat-merge" />
                <Label htmlFor="strat-merge">Mesclar</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="replace" id="strat-replace" />
                <Label htmlFor="strat-replace">Substituir</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="skip" id="strat-skip" />
                <Label htmlFor="strat-skip">Manter existente</Label>
              </div>
            </RadioGroup>
          </div>
          <Button onClick={handleImport} className="w-full" disabled={!file || !preview}>
            <Upload className="mr-2 h-4 w-4" />
            Restaurar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
