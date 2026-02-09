import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLocalData } from '@/hooks/useLocalData'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage, type Language } from '@/contexts/LanguageContext'
import { useNotifications } from '@/hooks/useNotifications'
import { getSessionTimeoutMs } from '@/lib/auth/session-utils'
import { DEFAULT_DOMAIN_COLORS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Settings2,
  Download,
  Upload,
  Trash2,
  Database,
  Palette,
  Info,
  Plus,
  Globe,
  Target,
  Save,
  LogOut,
  Bell,
  Cloud,
  CloudOff,
  Loader2,
  List,
  Languages,
  Shield,
  Tag,
  Key,
  Webhook,
  Mail,
  RotateCcw,
  Play,
  Square,
  Sparkles,
} from 'lucide-react'
import { useSyncStatus } from '@/hooks/useSyncStatus'
import { removeConflict, enqueue } from '@/lib/pwa/sync-queue'
import { clearAllMappings } from '@/lib/pwa/sync-id-map'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Enable2FAModal } from '@/components/Security/Enable2FAModal'
import { SessionsList } from '@/components/Security/SessionsList'
import { signOutAllDevices } from '@/lib/auth/sessions'
import { useWorkspaceContext } from '@/contexts/WorkspaceContext'
import { TranscriptionHistory } from '@/components/TranscriptionHistory'
import { ExportModal } from '@/components/ExportImport/ExportModal'
import { ImportModal } from '@/components/ExportImport/ImportModal'
import { getLastBackupDate, isBackupDue, getBackupSchedule, type BackupFrequency } from '@/lib/export/backup'
import { TagBadge } from '@/components/tags/TagBadge'
import { getAllTags, createTag, deleteTag } from '@/lib/tags/tag-service'
import { getDigestFrequency, setDigestFrequency, type DigestFrequency } from '@/lib/email/digest'
import { listApiKeys, createApiKey, revokeApiKey } from '@/lib/api/keys'
import { listWebhooks, addWebhook, removeWebhook } from '@/lib/api/webhooks'
import { Link } from 'react-router-dom'
import { ShortcutSettings } from '@/components/settings/ShortcutSettings'
import { useOnboarding } from '@/hooks/useOnboarding'
import { loadDemoData, unloadDemoData } from '@/lib/demo-data'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

const LANGUAGE_OPTIONS: { value: Language; label: string; flag: string }[] = [
  { value: 'pt-BR', label: 'Português (Brasil)', flag: '🇧🇷' },
  { value: 'en', label: 'English', flag: '🇺🇸' },
  { value: 'es', label: 'Español', flag: '🇪🇸' },
]

export function Settings() {
  const { t } = useTranslation()
  const { language, setLanguage } = useLanguage()
  const { exportData, importData, opportunities, dailyLogs, habits, goals, domains, addDomain, weeklyTargets, setWeeklyTarget } = useLocalData()
  const { user, signOut } = useAuth()
  const { preferences: notifPrefs, updatePreferences } = useNotifications()
  const { status, pendingCount, queueItems, conflicts, clearPendingQueue, clearPendingConflicts, runSync, lastError } = useSyncStatus()
  const { logActivity } = useWorkspaceContext()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [showDomainDialog, setShowDomainDialog] = useState(false)
  const [showQueueDialog, setShowQueueDialog] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [security2FAOpen, setSecurity2FAOpen] = useState(false)
  const [remindersEnabled, setRemindersEnabled] = useState(() => {
    try { return localStorage.getItem('lifeos_reminders_enabled') !== 'false' } catch { return true }
  })
  const [digestFreq, setDigestFreq] = useState<DigestFrequency>(() => getDigestFrequency())
  const [apiKeys, setApiKeys] = useState(() => listApiKeys())
  const [webhooks, setWebhooks] = useState(() => listWebhooks())
  const [newWebhookUrl, setNewWebhookUrl] = useState('')
  const [tags, setTags] = useState(() => getAllTags())
  const { demoMode, resetTour, toggleDemoMode } = useOnboarding()
  const [newDomainName, setNewDomainName] = useState('')
  const [newDomainColor, setNewDomainColor] = useState<string>(DEFAULT_DOMAIN_COLORS[0])
  const [newDomainTarget, setNewDomainTarget] = useState(20)

  // Weekly targets local editing state
  const [editingTargets, setEditingTargets] = useState<Record<string, { opp: number; hours: number }>>(() => {
    const initial: Record<string, { opp: number; hours: number }> = {}
    weeklyTargets.forEach(wt => {
      initial[wt.domain_id] = { opp: wt.opportunities_target, hours: wt.hours_target }
    })
    return initial
  })

  function handleSaveWeeklyTargets() {
    Object.entries(editingTargets).forEach(([domainId, { opp, hours }]) => {
      if (opp > 0 || hours > 0) {
        setWeeklyTarget(domainId, opp, hours)
      }
    })
    toast.success(t('settings.weeklyGoalsSaved'))
  }

  function handleExport() {
    exportData()
    toast.success(t('settings.dataExported'))
  }

  function handleImportClick() {
    fileInputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
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
    }
    setImporting(false)
    e.target.value = ''
  }

  function handleClearAll() {
    if (!window.confirm(t('settings.clearAllConfirm'))) return
    localStorage.clear()
    toast.success(t('settings.allDataCleared'))
    setTimeout(() => window.location.reload(), 1000)
  }

  function handleAddDomain(e: React.FormEvent) {
    e.preventDefault()
    if (!newDomainName.trim()) return
    addDomain(newDomainName.trim(), newDomainColor, newDomainTarget)
    toast.success(t('settings.domainCreated', { name: newDomainName.trim() }))
    setNewDomainName('')
    setNewDomainColor(DEFAULT_DOMAIN_COLORS[0])
    setNewDomainTarget(20)
    setShowDomainDialog(false)
  }

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <Settings2 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">{t('settings.title')}</h1>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Language */}
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Languages className="h-5 w-5 text-primary" />
              {t('settings.language')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{t('settings.languageDescription')}</p>
            <div className="flex flex-wrap gap-2">
              {LANGUAGE_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant={language === opt.value ? 'default' : 'outline'}
                  size="sm"
                  className="gap-2"
                  onClick={() => setLanguage(opt.value)}
                >
                  <span>{opt.flag}</span>
                  <span>{opt.label}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Session timeout */}
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-primary" />
              {t('settings.sessionTimeout')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{t('settings.sessionTimeoutDescription')}</p>
            <Select
              value={String(Math.round(getSessionTimeoutMs() / 60000))}
              onValueChange={(v) => {
                const min = parseInt(v, 10)
                localStorage.setItem('lifeos_session_timeout_min', String(min))
                toast.success(t('common.saved'))
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 min</SelectItem>
                <SelectItem value="30">30 min</SelectItem>
                <SelectItem value="60">60 min</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Theme */}
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Palette className="h-5 w-5 text-primary" />
              {t('settings.appearance')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t('settings.theme')}</p>
                <p className="text-sm text-muted-foreground">{t('settings.themeDescription')}</p>
              </div>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>

        {/* Keyboard Shortcuts */}
        <ShortcutSettings />

        {/* Security: 2FA + Sessions */}
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-primary" />
              {t('settings.security')}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{t('settings.securityDescription')}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-1">{t('settings.twoFactor')}</p>
              <Button variant="outline" size="sm" onClick={() => setSecurity2FAOpen(true)}>
                {t('settings.enable2FA')}
              </Button>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">{t('settings.sessions')}</p>
              <SessionsList />
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Sair de todos os dispositivos</p>
              <p className="text-xs text-muted-foreground mb-2">
                Encerra todas as sessoes ativas, incluindo este dispositivo.
              </p>
              <Button
                variant="destructive"
                size="sm"
                className="gap-2"
                onClick={async () => {
                  if (!window.confirm('Tem certeza? Voce sera deslogado de todos os dispositivos.')) return
                  logActivity('session.signout_all', 'session', undefined, { device: 'all' })
                  const { error } = await signOutAllDevices()
                  if (error) {
                    toast.error(error)
                  } else {
                    toast.success('Todas as sessoes foram encerradas')
                    setTimeout(() => window.location.reload(), 1000)
                  }
                }}
              >
                <LogOut className="h-4 w-4" />
                Sair de Todos os Dispositivos
              </Button>
            </div>
          </CardContent>
        </Card>
        <Enable2FAModal open={security2FAOpen} onOpenChange={setSecurity2FAOpen} />

        {/* Reminders */}
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5 text-primary" />
              {t('settings.reminders')}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{t('settings.remindersDescription')}</p>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label htmlFor="reminders-toggle" className="text-sm font-medium">{t('settings.remindersInApp')}</Label>
              <Switch
                id="reminders-toggle"
                checked={remindersEnabled}
                onCheckedChange={(v) => {
                  setRemindersEnabled(v)
                  localStorage.setItem('lifeos_reminders_enabled', String(v))
                  toast.success(t('common.saved'))
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Email digest */}
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="h-5 w-5 text-primary" />
              {t('settings.emailDigest')}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{t('settings.emailDigestDescription')}</p>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Label htmlFor="digest-freq" className="text-sm font-medium">{t('settings.digestFrequency')}</Label>
              <Select value={digestFreq} onValueChange={(v: DigestFrequency) => { setDigestFreq(v); setDigestFrequency(v); toast.success(t('common.saved')) }}>
                <SelectTrigger id="digest-freq" className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="off">{t('settings.digestOff')}</SelectItem>
                  <SelectItem value="daily">{t('settings.digestDaily')}</SelectItem>
                  <SelectItem value="weekly">{t('settings.digestWeekly')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Integrations: API keys & Webhooks */}
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Key className="h-5 w-5 text-primary" />
              {t('settings.integrations')}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{t('settings.integrationsDescription')}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">{t('settings.apiKeys')}</p>
              {apiKeys.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('settings.noApiKeys')}</p>
              ) : (
                <ul className="space-y-2">
                  {apiKeys.map((k) => (
                    <li key={k.id} className="flex items-center justify-between rounded-lg border p-2 text-sm">
                      <span className="font-mono text-muted-foreground">{k.prefix}</span>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => {
                        revokeApiKey(k.id)
                        setApiKeys(listApiKeys())
                        toast.success(t('settings.apiKeyRevoked'))
                      }}>{t('settings.revoke')}</Button>
                    </li>
                  ))}
                </ul>
              )}
              <Button variant="outline" size="sm" className="mt-2 gap-1" onClick={() => {
                const name = window.prompt(t('settings.apiKeyNamePrompt') || 'Key name')
                if (!name?.trim()) return
                const { key, record } = createApiKey(name.trim())
                setApiKeys(listApiKeys())
                toast.success(t('settings.apiKeyCreated'))
                navigator.clipboard.writeText(key).catch(() => {})
              }}>
                <Plus className="h-4 w-4" /> {t('settings.createApiKey')}
              </Button>
            </div>
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-1"><Webhook className="h-4 w-4" /> {t('settings.webhooks')}</p>
              <div className="flex gap-2 mb-2">
                <Input placeholder="https://api.example.com/webhook" value={newWebhookUrl} onChange={(e) => setNewWebhookUrl(e.target.value)} className="flex-1" />
                <Button size="sm" onClick={() => {
                  if (!newWebhookUrl.trim()) return
                  addWebhook(newWebhookUrl.trim(), ['opportunity_created', 'opportunity_updated', 'journal_created'])
                  setWebhooks(listWebhooks())
                  setNewWebhookUrl('')
                  toast.success(t('settings.webhookAdded'))
                }}>{t('settings.addWebhook')}</Button>
              </div>
              {webhooks.length > 0 && (
                <ul className="space-y-2">
                  {webhooks.map((w) => (
                    <li key={w.id} className="flex items-center justify-between rounded-lg border p-2 text-sm">
                      <span className="truncate text-muted-foreground">{w.url}</span>
                      <Button variant="ghost" size="sm" className="text-destructive shrink-0" onClick={() => {
                        removeWebhook(w.id)
                        setWebhooks(listWebhooks())
                        toast.success(t('settings.webhookRemoved'))
                      }}>{t('settings.remove')}</Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <a href="/docs/api.md" target="_blank" rel="noopener" className="text-sm text-primary hover:underline">{t('settings.apiDocs')}</a>
          </CardContent>
        </Card>

        {/* Sync */}
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              {status === 'syncing' ? (
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
              ) : status === 'offline' ? (
                <CloudOff className="h-5 w-5 text-amber-500" />
              ) : (
                <Cloud className="h-5 w-5 text-primary" />
              )}
              {t('settings.sync')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-2 text-sm">
              <span className="text-muted-foreground">{t('settings.syncStatus')}</span>
              <Badge variant={status === 'offline' ? 'destructive' : 'secondary'}>
                {status === 'offline' ? t('settings.offline') : status === 'syncing' ? t('settings.syncing') : t('settings.online')}
              </Badge>
            </div>
            {(pendingCount > 0 || queueItems.length > 0 || conflicts.length > 0) && (
              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-2 text-sm">
                <span className="text-muted-foreground">{t('settings.inQueue')}</span>
                <Badge variant="secondary">{queueItems.length + conflicts.length} {t('settings.items')}</Badge>
              </div>
            )}
            {lastError && (
              <p className="text-xs text-destructive">{lastError}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {(queueItems.length > 0 || conflicts.length > 0) && (
                <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowQueueDialog(true)}>
                  <List className="h-4 w-4" /> {t('settings.viewQueue')}
                </Button>
              )}
              {queueItems.length > 0 && (
                <Button variant="outline" size="sm" className="gap-1 text-destructive" onClick={() => {
                  if (window.confirm(t('settings.clearQueueConfirm'))) {
                    clearPendingQueue()
                    clearPendingConflicts()
                    setShowQueueDialog(false)
                    toast.success(t('settings.queueCleared'))
                  }
                }}>
                  <Trash2 className="h-4 w-4" /> {t('settings.clearQueue')}
                </Button>
              )}
              {status === 'online' && pendingCount > 0 && (
                <Button size="sm" className="gap-1" onClick={() => runSync().then(() => toast.success(t('settings.syncDone')))}>
                  <Cloud className="h-4 w-4" /> {t('settings.syncNow')}
                </Button>
              )}
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={() => {
                if (window.confirm(t('settings.clearIdMapConfirm') || 'Limpar mapeamento local↔servidor? Use só se tiver problemas de sincronização.')) {
                  clearAllMappings()
                  toast.success(t('settings.idMapCleared') || 'Mapeamento limpo.')
                }
              }}>
                {t('settings.clearIdMap') || 'Limpar mapeamento de IDs'}
              </Button>
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={async () => {
                if (!window.confirm('Limpar todo o cache offline e recarregar? Dados não sincronizados podem ser perdidos.')) return
                try {
                  const { clearAllStores } = await import('@/lib/offline/offline-db')
                  await clearAllStores()
                  if ('caches' in window) {
                    const keys = await caches.keys()
                    await Promise.all(keys.map((k) => caches.delete(k)))
                  }
                  if ('serviceWorker' in navigator) {
                    const regs = await navigator.serviceWorker.getRegistrations()
                    await Promise.all(regs.map((r) => r.unregister()))
                  }
                } catch {}
                window.location.reload()
              }}>
                <RotateCcw className="h-4 w-4" />
                Forçar atualização (limpar cache)
              </Button>
            </div>
          </CardContent>
        </Card>
        <Dialog open={showQueueDialog} onOpenChange={setShowQueueDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('settings.syncQueueTitle')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {queueItems.length === 0 && conflicts.length === 0 && (
                <p className="text-sm text-muted-foreground">{t('settings.noPendingItems')}</p>
              )}
              {queueItems.map((item) => (
                <div key={item.id} className="rounded-lg border border-border/50 p-2 text-sm">
                  <span className="font-medium">{item.type.replace(/_/g, ' ')}</span>
                  <span className="text-muted-foreground ml-1">• {item.localId}</span>
                </div>
              ))}
              {conflicts.map((c) => (
                <div key={c.queueId} className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm space-y-2">
                  <div>
                    <span className="font-medium">{t('settings.conflict')}: {c.type.replace(/_/g, ' ')}</span>
                    <span className="text-muted-foreground ml-1">• {c.localId}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {c.reason === 'newer_on_server'
                      ? 'O servidor tem uma versão mais recente deste item.'
                      : 'O servidor rejeitou esta alteração.'}
                  </p>
                  {c.serverData && (
                    <details className="text-xs text-muted-foreground">
                      <summary className="cursor-pointer hover:text-foreground">Ver dados do servidor</summary>
                      <pre className="mt-1 max-h-24 overflow-auto rounded bg-muted p-1.5 text-[10px]">
                        {JSON.stringify(c.serverData, null, 2)}
                      </pre>
                    </details>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" variant="default" onClick={() => {
                      enqueue(c.type, c.payload, c.localId)
                      removeConflict(c.queueId)
                      toast.success('Mantendo versão local. Re-enviando...')
                    }}>
                      Manter meu
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      removeConflict(c.queueId)
                      toast.success('Usando versão do servidor.')
                    }}>
                      Usar do servidor
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowQueueDialog(false)}>{t('settings.close')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Data stats */}
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

        {/* Backup e exportação */}
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Download className="h-5 w-5 text-primary" />
              {t('settings.backupExport')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t('settings.backupDescription')}
            </p>
            {t('settings.privacyExportNote') && (
              <p className="text-xs text-muted-foreground">{t('settings.privacyExportNote')}</p>
            )}
            {/* Last backup info */}
            {(() => {
              const lastBackup = getLastBackupDate()
              const schedule = getBackupSchedule()
              const due = isBackupDue()
              return (
                <div className="rounded-lg bg-muted/50 p-2 text-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Último backup:</span>
                    <span className="font-medium">
                      {lastBackup ? new Date(lastBackup).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Nunca'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Agendamento:</span>
                    <Badge variant={due ? 'destructive' : 'secondary'}>
                      {schedule === 'off' ? 'Desativado' : schedule === 'daily' ? 'Diário' : schedule === 'weekly' ? 'Semanal' : 'Mensal'}
                    </Badge>
                  </div>
                  {due && (
                    <p className="text-xs text-destructive font-medium mt-1">
                      Seu backup está atrasado! Exporte agora.
                    </p>
                  )}
                </div>
              )
            })()}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setExportModalOpen(true)}>
                <Download className="mr-1 h-4 w-4" /> {t('settings.exportBackup')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setImportModalOpen(true)}>
                <Upload className="mr-1 h-4 w-4" /> {t('settings.restoreBackup')}
              </Button>
            </div>
          </CardContent>
        </Card>
        <ExportModal open={exportModalOpen} onOpenChange={setExportModalOpen} />
        <ImportModal open={importModalOpen} onOpenChange={setImportModalOpen} onSuccess={() => toast.success(t('settings.backupRestored'))} />

        {/* Domain Management */}
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-lg">
              <span className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                {t('settings.lifeDomains')}
              </span>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowDomainDialog(true)}>
                <Plus className="h-3 w-3" />{t('settings.add')}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {domains.map((domain) => (
              <div key={domain.id} className="flex items-center gap-3 rounded-lg bg-muted/50 p-2">
                <span className="h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: domain.color_theme }} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{domain.name}</p>
                  {domain.target_percentage != null && domain.target_percentage > 0 && (
                    <p className="text-xs text-muted-foreground">{t('settings.target')}: {domain.target_percentage}%</p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Tags */}
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-lg">
              <span className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-primary" />
                Tags
              </span>
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() => {
                  const name = window.prompt('Tag name')
                  if (name?.trim()) {
                    createTag(name.trim())
                    setTags(getAllTags())
                    toast.success('Tag created')
                  }
                }}
              >
                <Plus className="h-3 w-3" /> Add
              </Button>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Manage tags for opportunities and journal. Use in Opportunities to filter.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {tags.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tags yet. Create one or add from an opportunity.</p>
            ) : (
              tags.map((tag) => (
                <div key={tag.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-2">
                  <TagBadge tag={tag} />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-destructive hover:text-destructive"
                    onClick={() => {
                      if (window.confirm(`Delete tag "${tag.name}"?`)) {
                        deleteTag(tag.id)
                        setTags(getAllTags())
                        toast.success('Tag deleted')
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
            <Button variant="link" className="px-0 text-sm" asChild>
              <Link to="/import">Import from Markdown/CSV</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Weekly Goals */}
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-lg">
              <span className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                {t('settings.weeklyGoals')}
              </span>
              <Button size="sm" className="gap-1" onClick={handleSaveWeeklyTargets}>
                <Save className="h-3 w-3" />{t('settings.save')}
              </Button>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {t('settings.weeklyGoalsDescription')}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {domains.map((domain) => {
              const current = editingTargets[domain.id] || { opp: 0, hours: 0 }
              return (
                <div key={domain.id} className="rounded-lg bg-muted/50 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: domain.color_theme }} />
                    <span className="text-sm font-medium">{domain.name}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t('settings.tasksPerWeek')}</Label>
                      <Input
                        type="number"
                        min={0}
                        max={50}
                        value={current.opp}
                        onChange={(e) => setEditingTargets(prev => ({
                          ...prev,
                          [domain.id]: { ...prev[domain.id] || { opp: 0, hours: 0 }, opp: Number(e.target.value) },
                        }))}
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t('settings.hoursPerWeek')}</Label>
                      <Input
                        type="number"
                        min={0}
                        max={80}
                        step={0.5}
                        value={current.hours}
                        onChange={(e) => setEditingTargets(prev => ({
                          ...prev,
                          [domain.id]: { ...prev[domain.id] || { opp: 0, hours: 0 }, hours: Number(e.target.value) },
                        }))}
                        className="h-8"
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Export/Import */}
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Download className="h-5 w-5 text-primary" />
              {t('settings.backupRestore')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={handleExport} className="w-full gap-2">
              <Download className="h-4 w-4" />{t('settings.exportAllData')}
            </Button>
            <Button onClick={handleImportClick} variant="outline" className="w-full gap-2" disabled={importing}>
              <Upload className="h-4 w-4" />{importing ? t('settings.importing') : t('settings.importBackup')}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileChange}
            />
            <p className="text-xs text-muted-foreground">
              {t('settings.exportDescription')}
            </p>
          </CardContent>
        </Card>

        {/* Onboarding & Demo */}
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              {t('onboarding.help.demoMode')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t('onboarding.help.demoModeDesc')}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => {
                resetTour()
                toast.info(t('onboarding.help.tourRestarted'))
              }}>
                <RotateCcw className="h-4 w-4" />
                {t('onboarding.help.restartTour')}
              </Button>
              <Button
                variant={demoMode ? 'destructive' : 'outline'}
                size="sm"
                className="gap-2"
                onClick={() => {
                  if (demoMode) {
                    unloadDemoData()
                    toggleDemoMode()
                    toast.info(t('onboarding.help.demoUnloaded'))
                  } else {
                    loadDemoData()
                    toggleDemoMode()
                    toast.info(t('onboarding.help.demoLoaded'))
                  }
                }}
              >
                {demoMode ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {demoMode ? t('onboarding.help.disableDemo') : t('onboarding.help.enableDemo')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Danger zone */}
        <Card className="rounded-xl border-destructive/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-destructive">
              <Trash2 className="h-5 w-5" />
              {t('settings.dangerZone')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="destructive" onClick={handleClearAll} className="w-full gap-2">
              <Trash2 className="h-4 w-4" />{t('settings.clearAllData')}
            </Button>
            <p className="text-xs text-muted-foreground">
              {t('settings.clearAllDescription')}
            </p>
          </CardContent>
        </Card>

        {/* Account */}
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <LogOut className="h-5 w-5 text-primary" />
              {t('settings.account')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {user && (
              <p className="text-sm text-muted-foreground">
                {t('settings.loggedAs')}: <span className="font-medium text-foreground">{user.email}</span>
              </p>
            )}
            <Button variant="outline" onClick={signOut} className="w-full gap-2">
              <LogOut className="h-4 w-4" />{t('settings.signOut')}
            </Button>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card className="rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5 text-primary" />
              {t('nav.notifications')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Master toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{t('settings.enableNotifications')}</p>
                <p className="text-xs text-muted-foreground">{t('settings.receiveNotifications')}</p>
              </div>
              <Switch
                checked={notifPrefs.enabled}
                onCheckedChange={(enabled) => updatePreferences({ enabled })}
              />
            </div>

            {/* Channels */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('settings.channels')}</Label>
              {(['in_app', 'push', 'email'] as const).map(ch => (
                <div key={ch} className="flex items-center justify-between rounded-lg bg-muted/50 p-2">
                  <span className="text-sm capitalize">{ch.replace('_', '-')}</span>
                  <Switch
                    checked={notifPrefs.channels[ch]}
                    onCheckedChange={(val) => updatePreferences({
                      channels: { ...notifPrefs.channels, [ch]: val }
                    })}
                  />
                </div>
              ))}
            </div>

            {/* Notification types */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('settings.notificationTypes')}</Label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(notifPrefs.types).map(([type, enabled]) => (
                  <div key={type} className="flex items-center justify-between rounded-lg bg-muted/50 p-2">
                    <span className="text-xs capitalize">{type.replace(/_/g, ' ')}</span>
                    <Switch
                      checked={enabled}
                      onCheckedChange={(val) => updatePreferences({
                        types: { ...notifPrefs.types, [type]: val }
                      })}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Quiet hours */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('settings.quietHours')}</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t('settings.start')}</Label>
                  <Input
                    type="time"
                    value={notifPrefs.quietHoursStart ?? ''}
                    onChange={(e) => updatePreferences({ quietHoursStart: e.target.value || null })}
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{t('settings.end')}</Label>
                  <Input
                    type="time"
                    value={notifPrefs.quietHoursEnd ?? ''}
                    onChange={(e) => updatePreferences({ quietHoursEnd: e.target.value || null })}
                    className="h-8"
                  />
                </div>
              </div>
            </div>

            {/* Digest frequency */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('settings.digest')}</Label>
              <Select
                value={notifPrefs.digestFrequency}
                onValueChange={(val) => updatePreferences({ digestFrequency: val as 'none' | 'daily' | 'weekly' })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('settings.none')}</SelectItem>
                  <SelectItem value="daily">{t('settings.dailyDigest')}</SelectItem>
                  <SelectItem value="weekly">{t('settings.weeklyDigest')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Group similar */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{t('settings.groupSimilar')}</p>
                <p className="text-xs text-muted-foreground">{t('settings.groupByType')}</p>
              </div>
              <Switch
                checked={notifPrefs.groupSimilar}
                onCheckedChange={(groupSimilar) => updatePreferences({ groupSimilar })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Transcription History */}
        <TranscriptionHistory />

        {/* About */}
        <Card className="rounded-xl lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Info className="h-5 w-5 text-primary" />
              {t('settings.aboutLifeOS')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t('settings.aboutDescription')} <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">?</kbd> {t('settings.aboutShortcuts')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Add Domain Dialog */}
      <Dialog open={showDomainDialog} onOpenChange={setShowDomainDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('settings.newDomain')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddDomain} className="space-y-4">
            <div className="space-y-2">
              <Label>{t('settings.name')}</Label>
              <Input
                value={newDomainName}
                onChange={(e) => setNewDomainName(e.target.value)}
                placeholder={t('settings.domainPlaceholder')}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{t('settings.color')}</Label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_DOMAIN_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewDomainColor(color)}
                    className={cn(
                      'h-8 w-8 rounded-full transition-all',
                      newDomainColor === color && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('settings.targetPercentage')}</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={newDomainTarget}
                onChange={(e) => setNewDomainTarget(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">{t('settings.targetDescription')}</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDomainDialog(false)}>{t('settings.cancel')}</Button>
              <Button type="submit" disabled={!newDomainName.trim()}>{t('settings.create')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
