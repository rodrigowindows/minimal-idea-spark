import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  downloadJson,
  downloadOpportunitiesCsv,
  downloadJournalCsv,
  getCurrentDataSummary,
  getBackupSchedule,
  setBackupSchedule,
  setLastBackupDate,
  type BackupFrequency,
} from '@/lib/export/backup'
import { Download, FileJson, FileSpreadsheet, Clock, Database } from 'lucide-react'

type ExportFormat = 'json' | 'csv-opportunities' | 'csv-journal'

interface ExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId?: string
}

export function ExportModal({ open, onOpenChange, workspaceId }: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>('json')
  const [schedule, setSchedule] = useState<BackupFrequency>(() => getBackupSchedule())
  const summary = open ? getCurrentDataSummary() : null

  const handleExport = () => {
    switch (format) {
      case 'json':
        downloadJson(workspaceId)
        setLastBackupDate(new Date().toISOString())
        break
      case 'csv-opportunities':
        downloadOpportunitiesCsv()
        break
      case 'csv-journal':
        downloadJournalCsv()
        break
    }
    onOpenChange(false)
  }

  const handleScheduleChange = (freq: BackupFrequency) => {
    setSchedule(freq)
    setBackupSchedule(freq)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exportar dados
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Data summary */}
          {summary && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                Resumo dos dados
              </p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {summary.opportunities > 0 && (
                  <div className="flex items-center justify-between rounded bg-background p-1.5">
                    <span className="text-muted-foreground">Oportunidades</span>
                    <Badge variant="secondary" className="text-xs">{summary.opportunities}</Badge>
                  </div>
                )}
                {summary.journal > 0 && (
                  <div className="flex items-center justify-between rounded bg-background p-1.5">
                    <span className="text-muted-foreground">Diário</span>
                    <Badge variant="secondary" className="text-xs">{summary.journal}</Badge>
                  </div>
                )}
                {summary.habits > 0 && (
                  <div className="flex items-center justify-between rounded bg-background p-1.5">
                    <span className="text-muted-foreground">Hábitos</span>
                    <Badge variant="secondary" className="text-xs">{summary.habits}</Badge>
                  </div>
                )}
                {summary.goals > 0 && (
                  <div className="flex items-center justify-between rounded bg-background p-1.5">
                    <span className="text-muted-foreground">Metas</span>
                    <Badge variant="secondary" className="text-xs">{summary.goals}</Badge>
                  </div>
                )}
                {summary.calendarEvents > 0 && (
                  <div className="flex items-center justify-between rounded bg-background p-1.5">
                    <span className="text-muted-foreground">Eventos</span>
                    <Badge variant="secondary" className="text-xs">{summary.calendarEvents}</Badge>
                  </div>
                )}
                {summary.domains > 0 && (
                  <div className="flex items-center justify-between rounded bg-background p-1.5">
                    <span className="text-muted-foreground">Domínios</span>
                    <Badge variant="secondary" className="text-xs">{summary.domains}</Badge>
                  </div>
                )}
                {summary.tags > 0 && (
                  <div className="flex items-center justify-between rounded bg-background p-1.5">
                    <span className="text-muted-foreground">Tags</span>
                    <Badge variant="secondary" className="text-xs">{summary.tags}</Badge>
                  </div>
                )}
                {summary.automations > 0 && (
                  <div className="flex items-center justify-between rounded bg-background p-1.5">
                    <span className="text-muted-foreground">Automações</span>
                    <Badge variant="secondary" className="text-xs">{summary.automations}</Badge>
                  </div>
                )}
                {summary.settings > 0 && (
                  <div className="flex items-center justify-between rounded bg-background p-1.5">
                    <span className="text-muted-foreground">Config.</span>
                    <Badge variant="secondary" className="text-xs">{summary.settings}</Badge>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Total: {summary.totalKeys} chaves de dados
              </p>
            </div>
          )}

          {/* Format selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Formato de exportação</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
              <div className="flex items-start space-x-2 rounded-lg border p-3 hover:bg-muted/30 transition-colors">
                <RadioGroupItem value="json" id="export-json" className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="export-json" className="flex items-center gap-2 cursor-pointer">
                    <FileJson className="h-4 w-4 text-blue-500" />
                    JSON completo (backup)
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Inclui todos os dados: oportunidades, diário, hábitos, metas, configurações e mais.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-2 rounded-lg border p-3 hover:bg-muted/30 transition-colors">
                <RadioGroupItem value="csv-opportunities" id="export-csv-opp" className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="export-csv-opp" className="flex items-center gap-2 cursor-pointer">
                    <FileSpreadsheet className="h-4 w-4 text-green-500" />
                    CSV — Oportunidades
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Exporta oportunidades para planilha (Excel, Google Sheets).
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-2 rounded-lg border p-3 hover:bg-muted/30 transition-colors">
                <RadioGroupItem value="csv-journal" id="export-csv-journal" className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="export-csv-journal" className="flex items-center gap-2 cursor-pointer">
                    <FileSpreadsheet className="h-4 w-4 text-green-500" />
                    CSV — Diário
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Exporta entradas do diário para planilha.
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Backup schedule */}
          <div className="space-y-2 rounded-lg border p-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Lembrete de backup automático
            </Label>
            <p className="text-xs text-muted-foreground">
              Receba um lembrete para fazer backup regularmente.
            </p>
            <Select value={schedule} onValueChange={(v) => handleScheduleChange(v as BackupFrequency)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="off">Desativado</SelectItem>
                <SelectItem value="daily">Diário</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="monthly">Mensal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Baixar exportação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
