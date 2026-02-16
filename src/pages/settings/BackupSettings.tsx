import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Database, Download, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'

import { useLocalData } from '@/hooks/useLocalData'
import { clearStorage } from '@/lib/storage'
import {
  getBackupSchedule,
  getLastBackupDate,
  isBackupDue,
} from '@/lib/export/backup'
import { ExportModal } from '@/components/ExportImport/ExportModal'
import { ImportModal } from '@/components/ExportImport/ImportModal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function BackupSettings() {
  const { t } = useTranslation()
  const {
    opportunities,
    dailyLogs,
    habits,
    goals,
    domains,
    exportData,
    importData,
  } = useLocalData()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)

  function handleExport() {
    exportData()
    toast.success(t('settings.dataExported'))
  }

  function handleImportClick() {
    fileInputRef.current?.click()
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setImporting(true)
    try {
      const text = await file.text()
      const success = importData(text)
      if (success) {
        toast.success(t('settings.dataImported'))
      } else {
        toast.error(t('settings.invalidBackup'))
      }
    } catch {
      toast.error(t('settings.failedToRead'))
    } finally {
      setImporting(false)
      event.target.value = ''
    }
  }

  function handleClearAll() {
    if (!window.confirm(t('settings.clearAllConfirm'))) return
    clearStorage()
    toast.success(t('settings.allDataCleared'))
    setTimeout(() => window.location.reload(), 1000)
  }

  const lastBackup = getLastBackupDate()
  const schedule = getBackupSchedule()
  const due = isBackupDue()

  return (
    <>
      <Card className="rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Database className="h-5 w-5 text-primary" />
            {t('settings.dataOverview')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between rounded-lg bg-muted/50 p-2">
              <span className="text-muted-foreground">{t('settings.domains')}</span>
              <Badge variant="secondary">{domains.length}</Badge>
            </div>
            <div className="flex justify-between rounded-lg bg-muted/50 p-2">
              <span className="text-muted-foreground">{t('nav.opportunities')}</span>
              <Badge variant="secondary">{opportunities.length}</Badge>
            </div>
            <div className="flex justify-between rounded-lg bg-muted/50 p-2">
              <span className="text-muted-foreground">{t('settings.journalEntries')}</span>
              <Badge variant="secondary">{dailyLogs.length}</Badge>
            </div>
            <div className="flex justify-between rounded-lg bg-muted/50 p-2">
              <span className="text-muted-foreground">{t('nav.habits')}</span>
              <Badge variant="secondary">{habits.length}</Badge>
            </div>
            <div className="flex justify-between rounded-lg bg-muted/50 p-2">
              <span className="text-muted-foreground">{t('nav.goals')}</span>
              <Badge variant="secondary">{goals.length}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Download className="h-5 w-5 text-primary" />
            {t('settings.backupExport')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{t('settings.backupDescription')}</p>
          {t('settings.privacyExportNote') && (
            <p className="text-xs text-muted-foreground">{t('settings.privacyExportNote')}</p>
          )}
          <div className="space-y-1 rounded-lg bg-muted/50 p-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Último backup:</span>
              <span className="font-medium">
                {lastBackup
                  ? new Date(lastBackup).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'Nunca'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Agendamento:</span>
              <Badge variant={due ? 'destructive' : 'secondary'}>
                {schedule === 'off'
                  ? 'Desativado'
                  : schedule === 'daily'
                    ? 'Diário'
                    : schedule === 'weekly'
                      ? 'Semanal'
                      : 'Mensal'}
              </Badge>
            </div>
            {due && (
              <p className="mt-1 text-xs font-medium text-destructive">
                Seu backup está atrasado! Exporte agora.
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setExportModalOpen(true)}>
              <Download className="mr-1 h-4 w-4" />
              {t('settings.exportBackup')}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setImportModalOpen(true)}>
              <Upload className="mr-1 h-4 w-4" />
              {t('settings.restoreBackup')}
            </Button>
          </div>
        </CardContent>
      </Card>
      <ExportModal open={exportModalOpen} onOpenChange={setExportModalOpen} />
      <ImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onSuccess={() => toast.success(t('settings.backupRestored'))}
      />

      <Card className="rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Download className="h-5 w-5 text-primary" />
            {t('settings.backupRestore')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={handleExport} className="w-full gap-2">
            <Download className="h-4 w-4" />
            {t('settings.exportAllData')}
          </Button>
          <Button
            onClick={handleImportClick}
            variant="outline"
            className="w-full gap-2"
            disabled={importing}
          >
            <Upload className="h-4 w-4" />
            {importing ? t('settings.importing') : t('settings.importBackup')}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileChange}
          />
          <p className="text-xs text-muted-foreground">{t('settings.exportDescription')}</p>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-destructive/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-destructive">
            <Trash2 className="h-5 w-5" />
            {t('settings.dangerZone')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="destructive" onClick={handleClearAll} className="w-full gap-2">
            <Trash2 className="h-4 w-4" />
            {t('settings.clearAllData')}
          </Button>
          <p className="text-xs text-muted-foreground">{t('settings.clearAllDescription')}</p>
        </CardContent>
      </Card>
    </>
  )
}

