import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { previewBackupFile, restoreFromPayload, type RestoreStrategy, type ImportPreview } from '@/lib/export/restore'
import { Upload, AlertTriangle, CheckCircle2, FileJson, ArrowRight } from 'lucide-react'

interface ImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

const FRIENDLY_NAMES: Record<string, string> = {
  lifeos_domains: 'Domínios',
  lifeos_opportunities: 'Oportunidades',
  lifeos_daily_logs: 'Diário',
  lifeos_journal: 'Journal',
  lifeos_priorities: 'Prioridades',
  lifeos_goals: 'Metas',
  lifeos_habits: 'Hábitos',
  lifeos_weekly_targets: 'Metas Semanais',
  lifeos_automations: 'Automações',
  lifeos_version_snapshots: 'Snapshots',
  lifeos_version_branches: 'Branches',
  lifeos_templates: 'Templates',
  lifeos_tags: 'Tags',
  lifeos_opportunity_tags: 'Tags de Oportunidades',
  lifeos_journal_tags: 'Tags de Diário',
  lifeos_calendar_events: 'Eventos do Calendário',
  lifeos_focus_sessions: 'Sessões de Foco',
  lifeos_time_blocks: 'Blocos de Tempo',
  lifeos_assistant_threads: 'Conversas IA',
  lifeos_notification_preferences: 'Preferências de Notificação',
  lifeos_theme: 'Tema',
  lifeos_language: 'Idioma',
  minimal_idea_spark_xp_state: 'XP/Gamificação',
}

function friendlyName(key: string): string {
  return FRIENDLY_NAMES[key] || key.replace(/^lifeos_/, '').replace(/_/g, ' ')
}

export function ImportModal({ open, onOpenChange, onSuccess }: ImportModalProps) {
  const [strategy, setStrategy] = useState<RestoreStrategy>('merge')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [result, setResult] = useState<{ ok: boolean; restored: number; skipped: number; conflicts: number } | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    setFile(f ?? null)
    setError(null)
    setPreview(null)
    setResult(null)
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result as string
      const p = previewBackupFile(text)
      if (p.valid) {
        setPreview(p)
      } else {
        setError(p.error ?? 'Arquivo inválido.')
      }
    }
    reader.readAsText(f)
  }

  const handleImport = () => {
    if (!file || !preview?.payload) return
    const res = restoreFromPayload(preview.payload, strategy)
    if (res.ok) {
      setResult({
        ok: true,
        restored: res.keysRestored.length,
        skipped: res.keysSkipped.length,
        conflicts: res.conflicts.length,
      })
      onSuccess?.()
      window.dispatchEvent(new Event('storage'))
    } else {
      setError(res.error ?? 'Falha ao restaurar.')
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    setFile(null)
    setPreview(null)
    setResult(null)
    setError(null)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Restaurar backup
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* File upload */}
          <div>
            <Label>Arquivo JSON de backup</Label>
            <div className="mt-2 flex items-center gap-3">
              <label className="flex-1 cursor-pointer rounded-lg border-2 border-dashed border-border p-4 text-center transition-colors hover:border-primary/50 hover:bg-muted/30">
                <FileJson className="mx-auto h-8 w-8 text-muted-foreground mb-1" />
                <p className="text-sm text-muted-foreground">
                  {file ? file.name : 'Clique para selecionar o arquivo .json'}
                </p>
                {file && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                )}
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          </div>

          {/* Preview */}
          {preview?.summary && !result && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Prévia do backup</p>
                {preview.payload?.exportedAt && (
                  <Badge variant="outline" className="text-xs">
                    {new Date(preview.payload.exportedAt).toLocaleDateString('pt-BR', {
                      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </Badge>
                )}
              </div>

              <ScrollArea className="max-h-40">
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {preview.summary.opportunities > 0 && (
                    <div className="flex items-center justify-between rounded bg-background p-1.5">
                      <span className="text-muted-foreground">Oportunidades</span>
                      <Badge variant="secondary" className="text-xs">{preview.summary.opportunities}</Badge>
                    </div>
                  )}
                  {preview.summary.journal > 0 && (
                    <div className="flex items-center justify-between rounded bg-background p-1.5">
                      <span className="text-muted-foreground">Diário</span>
                      <Badge variant="secondary" className="text-xs">{preview.summary.journal}</Badge>
                    </div>
                  )}
                  {preview.summary.habits > 0 && (
                    <div className="flex items-center justify-between rounded bg-background p-1.5">
                      <span className="text-muted-foreground">Hábitos</span>
                      <Badge variant="secondary" className="text-xs">{preview.summary.habits}</Badge>
                    </div>
                  )}
                  {preview.summary.goals > 0 && (
                    <div className="flex items-center justify-between rounded bg-background p-1.5">
                      <span className="text-muted-foreground">Metas</span>
                      <Badge variant="secondary" className="text-xs">{preview.summary.goals}</Badge>
                    </div>
                  )}
                  {preview.summary.domains > 0 && (
                    <div className="flex items-center justify-between rounded bg-background p-1.5">
                      <span className="text-muted-foreground">Domínios</span>
                      <Badge variant="secondary" className="text-xs">{preview.summary.domains}</Badge>
                    </div>
                  )}
                  {preview.summary.calendarEvents > 0 && (
                    <div className="flex items-center justify-between rounded bg-background p-1.5">
                      <span className="text-muted-foreground">Eventos</span>
                      <Badge variant="secondary" className="text-xs">{preview.summary.calendarEvents}</Badge>
                    </div>
                  )}
                  {preview.summary.tags > 0 && (
                    <div className="flex items-center justify-between rounded bg-background p-1.5">
                      <span className="text-muted-foreground">Tags</span>
                      <Badge variant="secondary" className="text-xs">{preview.summary.tags}</Badge>
                    </div>
                  )}
                  {preview.summary.automations > 0 && (
                    <div className="flex items-center justify-between rounded bg-background p-1.5">
                      <span className="text-muted-foreground">Automações</span>
                      <Badge variant="secondary" className="text-xs">{preview.summary.automations}</Badge>
                    </div>
                  )}
                  {preview.summary.focusSessions > 0 && (
                    <div className="flex items-center justify-between rounded bg-background p-1.5">
                      <span className="text-muted-foreground">Sessões de Foco</span>
                      <Badge variant="secondary" className="text-xs">{preview.summary.focusSessions}</Badge>
                    </div>
                  )}
                  {preview.summary.templates > 0 && (
                    <div className="flex items-center justify-between rounded bg-background p-1.5">
                      <span className="text-muted-foreground">Templates</span>
                      <Badge variant="secondary" className="text-xs">{preview.summary.templates}</Badge>
                    </div>
                  )}
                  {preview.summary.settings > 0 && (
                    <div className="flex items-center justify-between rounded bg-background p-1.5">
                      <span className="text-muted-foreground">Configurações</span>
                      <Badge variant="secondary" className="text-xs">{preview.summary.settings}</Badge>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <p className="text-xs text-muted-foreground">
                Total: {preview.summary.totalKeys} chaves de dados
              </p>

              {/* Conflicts preview */}
              {preview.conflicts && preview.conflicts.length > 0 && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 space-y-1.5">
                  <p className="text-xs font-medium flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {preview.conflicts.length} possível(is) conflito(s)
                  </p>
                  {preview.conflicts.map((c) => (
                    <div key={c.key} className="text-xs text-muted-foreground flex items-center gap-1">
                      <ArrowRight className="h-3 w-3 shrink-0" />
                      <span className="font-medium">{friendlyName(c.key)}</span>:
                      {c.duplicateItems} duplicado(s), {c.newItems} novo(s)
                      <span className="text-muted-foreground/70">
                        ({c.existingCount} local / {c.incomingCount} no backup)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive flex items-center gap-2" role="alert">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </p>
          )}

          {/* Restore result */}
          {result && (
            <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3 space-y-1">
              <p className="text-sm font-medium flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                Backup restaurado com sucesso!
              </p>
              <p className="text-xs text-muted-foreground">
                {result.restored} chave(s) restaurada(s), {result.skipped} ignorada(s)
                {result.conflicts > 0 && `, ${result.conflicts} com duplicatas mescladas`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Atualize a página se necessário para ver todas as mudanças.
              </p>
            </div>
          )}

          {/* Strategy */}
          {preview && !result && (
            <div>
              <Label className="text-sm font-medium">Em caso de conflito</Label>
              <RadioGroup
                value={strategy}
                onValueChange={(v) => setStrategy(v as RestoreStrategy)}
                className="mt-2 space-y-2"
              >
                <div className="flex items-start space-x-2 rounded-lg border p-2.5 hover:bg-muted/30 transition-colors">
                  <RadioGroupItem value="merge" id="strat-merge" className="mt-0.5" />
                  <div>
                    <Label htmlFor="strat-merge" className="cursor-pointer text-sm">Mesclar</Label>
                    <p className="text-xs text-muted-foreground">Adiciona itens novos e mantém os existentes.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-2 rounded-lg border p-2.5 hover:bg-muted/30 transition-colors">
                  <RadioGroupItem value="replace" id="strat-replace" className="mt-0.5" />
                  <div>
                    <Label htmlFor="strat-replace" className="cursor-pointer text-sm">Substituir</Label>
                    <p className="text-xs text-muted-foreground">Substitui todos os dados existentes pelos do backup.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-2 rounded-lg border p-2.5 hover:bg-muted/30 transition-colors">
                  <RadioGroupItem value="skip" id="strat-skip" className="mt-0.5" />
                  <div>
                    <Label htmlFor="strat-skip" className="cursor-pointer text-sm">Manter existente</Label>
                    <p className="text-xs text-muted-foreground">Pula chaves que já existem localmente.</p>
                  </div>
                </div>
              </RadioGroup>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {result ? 'Fechar' : 'Cancelar'}
          </Button>
          {!result && (
            <Button onClick={handleImport} disabled={!file || !preview?.valid} className="gap-2">
              <Upload className="h-4 w-4" />
              Restaurar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
