import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { exportToJson } from '@/lib/export/backup'
import { Download } from 'lucide-react'

interface ExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId?: string
}

export function ExportModal({ open, onOpenChange, workspaceId }: ExportModalProps) {
  const [format, setFormat] = useState<'json' | 'csv'>('json')

  const handleExport = () => {
    if (format === 'json') {
      const blob = new Blob([exportToJson(workspaceId)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar dados</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <RadioGroup value={format} onValueChange={(v) => setFormat(v as 'json' | 'csv')}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="json" id="export-json" />
              <Label htmlFor="export-json">JSON completo (backup)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="csv" id="export-csv" disabled />
              <Label htmlFor="export-csv">CSV (em breve)</Label>
            </div>
          </RadioGroup>
          <Button onClick={handleExport} className="w-full" disabled={format === 'csv'}>
            <Download className="mr-2 h-4 w-4" />
            Baixar exportação
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
