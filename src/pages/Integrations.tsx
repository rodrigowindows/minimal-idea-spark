import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  Key,
  Webhook,
  Plus,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  FileJson,
  Upload,
  ExternalLink,
  Shield,
  Activity,
  Clock,
  Check,
  X,
  FileText,
  Zap,
  ArrowDownToLine,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  listApiKeys,
  createApiKey,
  revokeApiKey,
  type ApiKeyRecord,
} from '@/lib/api/keys'
import {
  listWebhooks,
  addWebhook,
  removeWebhook,
  updateWebhook,
  type WebhookEndpoint,
  type WebhookEvent,
  WEBHOOK_EVENT_LABELS,
} from '@/lib/api/webhooks'
import { parseCsvImport, parseJsonImport, type ImportItem, type ImportResult } from '@/lib/api/batch-import'
import { useLocalData } from '@/hooks/useLocalData'

export function Integrations() {
  const { t } = useTranslation()
  const { addOpportunity } = useLocalData()

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKeyRecord[]>(() => listApiKeys())
  const [showCreateKeyDialog, setShowCreateKeyDialog] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(['read', 'write'])
  const [lastCreatedKey, setLastCreatedKey] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)

  // Webhooks state
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>(() => listWebhooks())
  const [showCreateWebhookDialog, setShowCreateWebhookDialog] = useState(false)
  const [newWebhookUrl, setNewWebhookUrl] = useState('')
  const [newWebhookDesc, setNewWebhookDesc] = useState('')
  const [newWebhookEvents, setNewWebhookEvents] = useState<WebhookEvent[]>([
    'opportunity_created',
    'opportunity_updated',
    'journal_created',
  ])

  // Import state
  const [importText, setImportText] = useState('')
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleCreateApiKey() {
    if (!newKeyName.trim()) return
    const { key, record } = createApiKey(newKeyName.trim(), newKeyScopes)
    setApiKeys(listApiKeys())
    setLastCreatedKey(key)
    setShowKey(true)
    setNewKeyName('')
    setNewKeyScopes(['read', 'write'])
    toast.success(t('integrations.apiKeyCreated', 'API key created. Copy it now - it won\'t be shown again.'))
  }

  function handleRevokeKey(id: string) {
    if (!window.confirm(t('integrations.revokeConfirm', 'Revoke this API key? This cannot be undone.'))) return
    revokeApiKey(id)
    setApiKeys(listApiKeys())
    toast.success(t('integrations.apiKeyRevoked', 'API key revoked'))
  }

  function handleCopyKey() {
    if (lastCreatedKey) {
      navigator.clipboard.writeText(lastCreatedKey).catch(() => {})
      toast.success(t('integrations.copied', 'Copied to clipboard'))
    }
  }

  function handleCreateWebhook() {
    if (!newWebhookUrl.trim()) return
    if (newWebhookEvents.length === 0) {
      toast.error(t('integrations.selectEvents', 'Select at least one event'))
      return
    }
    addWebhook(newWebhookUrl.trim(), newWebhookEvents, newWebhookDesc.trim())
    setWebhooks(listWebhooks())
    setNewWebhookUrl('')
    setNewWebhookDesc('')
    setNewWebhookEvents(['opportunity_created', 'opportunity_updated', 'journal_created'])
    setShowCreateWebhookDialog(false)
    toast.success(t('integrations.webhookCreated', 'Webhook endpoint created'))
  }

  function handleToggleWebhook(id: string, enabled: boolean) {
    updateWebhook(id, { enabled })
    setWebhooks(listWebhooks())
  }

  function handleRemoveWebhook(id: string) {
    if (!window.confirm(t('integrations.removeWebhookConfirm', 'Remove this webhook endpoint?'))) return
    removeWebhook(id)
    setWebhooks(listWebhooks())
    toast.success(t('integrations.webhookRemoved', 'Webhook removed'))
  }

  function toggleWebhookEvent(event: WebhookEvent) {
    setNewWebhookEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    )
  }

  // Import handlers
  function handleImportFromText() {
    if (!importText.trim()) return

    let items: ImportItem[]
    const trimmed = importText.trim()

    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      items = parseJsonImport(trimmed)
    } else {
      items = parseCsvImport(trimmed)
    }

    if (items.length === 0) {
      toast.error(t('integrations.importNoItems', 'No valid items found'))
      return
    }

    const result: ImportResult = { total: items.length, success: 0, failed: 0, errors: [] }

    for (const item of items) {
      try {
        addOpportunity({
          title: item.title,
          description: item.description ?? '',
          status: item.status ?? 'backlog',
          domain_id: item.domain_id ?? '',
          type: (item as any).type ?? 'action',
          priority: (item as any).priority ?? 5,
          strategic_value: (item as any).strategic_value ?? null,
        })
        result.success++
      } catch (e) {
        result.failed++
        result.errors.push(`${item.title}: ${String(e)}`)
      }
    }

    setImportResult(result)
    setImportText('')
    toast.success(t('integrations.importDone', `Imported ${result.success} of ${result.total} items`))
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      setImportText(text)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <Zap className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">{t('integrations.title', 'Integrations & API')}</h1>
        </div>
        <p className="text-muted-foreground mt-1">
          {t('integrations.subtitle', 'Connect external tools, manage API keys, configure webhooks, and import data.')}
        </p>
      </header>

      <Tabs defaultValue="api-keys" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="api-keys" className="gap-1">
            <Key className="h-4 w-4" />
            <span className="hidden sm:inline">API Keys</span>
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-1">
            <Webhook className="h-4 w-4" />
            <span className="hidden sm:inline">Webhooks</span>
          </TabsTrigger>
          <TabsTrigger value="import" className="gap-1">
            <ArrowDownToLine className="h-4 w-4" />
            <span className="hidden sm:inline">Import</span>
          </TabsTrigger>
          <TabsTrigger value="docs" className="gap-1">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">API Docs</span>
          </TabsTrigger>
        </TabsList>

        {/* ========== API KEYS TAB ========== */}
        <TabsContent value="api-keys" className="space-y-4">
          <Card className="rounded-xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Key className="h-5 w-5 text-primary" />
                  {t('integrations.apiKeysTitle', 'API Keys')}
                </CardTitle>
                <Button size="sm" className="gap-1" onClick={() => setShowCreateKeyDialog(true)}>
                  <Plus className="h-4 w-4" /> {t('integrations.createKey', 'Create Key')}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('integrations.apiKeysDesc', 'Generate API keys for programmatic access to your data. Keys provide read and/or write access.')}
              </p>
            </CardHeader>
            <CardContent>
              {apiKeys.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Key className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>{t('integrations.noKeys', 'No API keys yet. Create one to get started.')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {apiKeys.map((k) => (
                    <div
                      key={k.id}
                      className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{k.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {k.scopes?.join(', ') || 'read, write'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="font-mono">{k.prefix}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(k.created_at).toLocaleDateString()}
                          </span>
                          {k.last_used_at && (
                            <span className="flex items-center gap-1">
                              <Activity className="h-3 w-3" />
                              Last: {new Date(k.last_used_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive shrink-0"
                        onClick={() => handleRevokeKey(k.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Rate limit info */}
              <div className="mt-4 rounded-lg bg-muted/50 p-3">
                <p className="text-sm font-medium flex items-center gap-1">
                  <Shield className="h-4 w-4 text-primary" />
                  {t('integrations.rateLimits', 'Rate Limits')}
                </p>
                <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                  <li>60 requests/minute per key</li>
                  <li>10,000 requests/day per key</li>
                  <li>100,000 requests/month per key</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== WEBHOOKS TAB ========== */}
        <TabsContent value="webhooks" className="space-y-4">
          <Card className="rounded-xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Webhook className="h-5 w-5 text-primary" />
                  {t('integrations.webhooksTitle', 'Outgoing Webhooks')}
                </CardTitle>
                <Button size="sm" className="gap-1" onClick={() => setShowCreateWebhookDialog(true)}>
                  <Plus className="h-4 w-4" /> {t('integrations.addWebhook', 'Add Webhook')}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('integrations.webhooksDesc', 'Notify external URLs when events occur. Use with Zapier, Make, or custom integrations.')}
              </p>
            </CardHeader>
            <CardContent>
              {webhooks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Webhook className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>{t('integrations.noWebhooks', 'No webhook endpoints configured.')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {webhooks.map((w) => (
                    <div
                      key={w.id}
                      className="rounded-lg border p-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Switch
                            checked={w.enabled}
                            onCheckedChange={(checked) => handleToggleWebhook(w.id, checked)}
                          />
                          <span className="truncate text-sm font-mono">{w.url}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive shrink-0"
                          onClick={() => handleRemoveWebhook(w.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {w.description && (
                        <p className="text-xs text-muted-foreground mb-1">{w.description}</p>
                      )}
                      <div className="flex flex-wrap gap-1">
                        {w.events.map((ev) => (
                          <Badge key={ev} variant="secondary" className="text-xs">
                            {WEBHOOK_EVENT_LABELS[ev] ?? ev}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Secret: <span className="font-mono">{w.secret?.slice(0, 16)}...</span>
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Inbound webhook info */}
              <div className="mt-4 rounded-lg bg-muted/50 p-3">
                <p className="text-sm font-medium flex items-center gap-1">
                  <ArrowDownToLine className="h-4 w-4 text-primary" />
                  {t('integrations.inboundWebhooks', 'Inbound Webhooks')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Receive data from external services. Send a POST to the <code className="bg-muted rounded px-1">webhook-inbound</code> edge
                  function with your API key in the <code className="bg-muted rounded px-1">Authorization: Bearer &lt;key&gt;</code> header.
                </p>
              </div>

              {/* Zapier/Make info */}
              <div className="mt-3 rounded-lg bg-muted/50 p-3">
                <p className="text-sm font-medium flex items-center gap-1">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Zapier / Make
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Use outgoing webhooks as <strong>triggers</strong> in Zapier/Make, and the inbound webhook endpoint as an <strong>action</strong> to create
                  opportunities or journal entries from external automations.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== IMPORT TAB ========== */}
        <TabsContent value="import" className="space-y-4">
          <Card className="rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Upload className="h-5 w-5 text-primary" />
                {t('integrations.batchImport', 'Batch Import')}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {t('integrations.batchImportDesc', 'Create opportunities in bulk from CSV or JSON data.')}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4" /> {t('integrations.uploadFile', 'Upload File')}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.json,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button variant="outline" size="sm" className="gap-1" onClick={() => {
                  setImportText('title,description,status\n"My Task","Description here","backlog"\n"Another Task","Second desc","doing"')
                }}>
                  <FileJson className="h-4 w-4" /> {t('integrations.loadSample', 'Load Sample CSV')}
                </Button>
              </div>

              <div>
                <Label className="text-sm">{t('integrations.pasteData', 'Paste CSV or JSON data')}</Label>
                <textarea
                  className="mt-1 w-full rounded-lg border bg-background p-3 font-mono text-sm min-h-[160px] focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={'CSV:\ntitle,description,status\n"Task 1","Desc","backlog"\n\nJSON:\n[{"title":"Task 1","status":"backlog"}]'}
                />
              </div>

              <Button onClick={handleImportFromText} disabled={!importText.trim()} className="gap-1">
                <ArrowDownToLine className="h-4 w-4" />
                {t('integrations.importNow', 'Import Now')}
              </Button>

              {importResult && (
                <div className={`rounded-lg border p-3 ${importResult.failed > 0 ? 'border-amber-500/50 bg-amber-50/10' : 'border-green-500/50 bg-green-50/10'}`}>
                  <p className="text-sm font-medium flex items-center gap-1">
                    {importResult.failed === 0 ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <X className="h-4 w-4 text-amber-600" />
                    )}
                    {t('integrations.importResult', 'Import Result')}
                  </p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                    <li>Total: {importResult.total}</li>
                    <li>Success: {importResult.success}</li>
                    {importResult.failed > 0 && <li>Failed: {importResult.failed}</li>}
                    {importResult.errors.map((err, i) => (
                      <li key={i} className="text-destructive">{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-sm font-medium">{t('integrations.csvFormat', 'CSV Format')}</p>
                <pre className="text-xs text-muted-foreground mt-1 overflow-x-auto">
{`title,description,status,domain_id,tags
"My Opportunity","Description here","backlog","domain-id","tag1;tag2"`}
                </pre>
                <p className="text-sm font-medium mt-3">{t('integrations.jsonFormat', 'JSON Format')}</p>
                <pre className="text-xs text-muted-foreground mt-1 overflow-x-auto">
{`[
  { "title": "My Opportunity", "description": "...", "status": "backlog" },
  { "title": "Another", "status": "doing" }
]`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== API DOCS TAB ========== */}
        <TabsContent value="docs" className="space-y-4">
          <Card className="rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-primary" />
                {t('integrations.apiDocsTitle', 'API Documentation')}
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <h3>Authentication</h3>
              <p>
                All API requests require an API key. Include it in the request body as <code>api_key</code>
                or for inbound webhooks, use the <code>Authorization: Bearer &lt;key&gt;</code> header.
              </p>
              <pre className="bg-muted rounded-lg p-3 text-xs overflow-x-auto">{`POST /functions/v1/api-auth
Content-Type: application/json

{
  "api_key": "lsk_your_key_here",
  "action": "validate"
}`}</pre>

              <h3>Endpoints (via api-auth)</h3>

              <h4>List Opportunities</h4>
              <pre className="bg-muted rounded-lg p-3 text-xs overflow-x-auto">{`{
  "api_key": "lsk_...",
  "action": "opportunities",
  "method": "GET",
  "status": "backlog",  // optional filter
  "limit": 50,          // optional, default 50
  "offset": 0           // optional
}`}</pre>

              <h4>Create Opportunity</h4>
              <pre className="bg-muted rounded-lg p-3 text-xs overflow-x-auto">{`{
  "api_key": "lsk_...",
  "action": "opportunities",
  "method": "POST",
  "data": {
    "title": "New Opportunity",
    "description": "Details...",
    "status": "backlog"
  }
}`}</pre>

              <h4>List Journal Entries</h4>
              <pre className="bg-muted rounded-lg p-3 text-xs overflow-x-auto">{`{
  "api_key": "lsk_...",
  "action": "journal",
  "method": "GET",
  "limit": 20
}`}</pre>

              <h4>Create Journal Entry</h4>
              <pre className="bg-muted rounded-lg p-3 text-xs overflow-x-auto">{`{
  "api_key": "lsk_...",
  "action": "journal",
  "method": "POST",
  "data": {
    "content": "Today I...",
    "mood": "good",
    "energy": 8
  }
}`}</pre>

              <h4>Batch Import Opportunities</h4>
              <pre className="bg-muted rounded-lg p-3 text-xs overflow-x-auto">{`{
  "api_key": "lsk_...",
  "action": "import",
  "items": [
    { "title": "Task 1", "status": "backlog" },
    { "title": "Task 2", "description": "Details" }
  ]
}`}</pre>

              <h3>Inbound Webhooks</h3>
              <p>
                External services (Zapier, Make, etc.) can push data to your workspace via the inbound webhook endpoint.
              </p>
              <pre className="bg-muted rounded-lg p-3 text-xs overflow-x-auto">{`POST /functions/v1/webhook-inbound
Authorization: Bearer lsk_your_key_here
Content-Type: application/json

{
  "type": "opportunity",
  "data": {
    "title": "From Zapier",
    "status": "backlog"
  }
}

// Or batch:
{
  "items": [
    { "type": "opportunity", "data": { "title": "Task 1" } },
    { "type": "journal", "data": { "content": "Auto-entry" } }
  ]
}`}</pre>

              <h3>Outgoing Webhooks</h3>
              <p>When configured events occur, LifeOS sends a POST request to your URL:</p>
              <pre className="bg-muted rounded-lg p-3 text-xs overflow-x-auto">{`POST https://your-url.com/webhook
Content-Type: application/json
X-LifeOS-Signature: sha256=<hmac_signature>
X-LifeOS-Event: opportunity_created
X-LifeOS-Delivery: <uuid>

{
  "event": "opportunity_created",
  "data": { "id": "...", "title": "...", ... },
  "timestamp": "2026-02-09T..."
}`}</pre>
              <p>
                Verify the <code>X-LifeOS-Signature</code> header using HMAC-SHA256 with your webhook secret.
                Failed deliveries are retried up to 3 times with exponential backoff.
              </p>

              <h3>Supported Webhook Events</h3>
              <ul>
                <li><code>opportunity_created</code> - New opportunity added</li>
                <li><code>opportunity_updated</code> - Opportunity status or details changed</li>
                <li><code>opportunity_deleted</code> - Opportunity removed</li>
                <li><code>journal_created</code> - New journal entry</li>
                <li><code>habit_completed</code> - Habit marked as done</li>
                <li><code>goal_completed</code> - Goal achieved</li>
                <li><code>import_completed</code> - Batch import finished</li>
              </ul>

              <h3>Rate Limits</h3>
              <ul>
                <li>60 requests per minute per API key</li>
                <li>10,000 requests per day per API key</li>
                <li>100,000 requests per month per API key</li>
              </ul>
              <p>Exceeding limits returns HTTP 429.</p>

              <h3>Error Responses</h3>
              <pre className="bg-muted rounded-lg p-3 text-xs overflow-x-auto">{`// 401 Unauthorized
{ "error": "Invalid or revoked API key" }

// 403 Forbidden
{ "error": "Insufficient scope: write required" }

// 429 Too Many Requests
{ "error": "Rate limit exceeded. Max 60 requests per minute." }

// 500 Internal Server Error
{ "error": "..." }`}</pre>

              <div className="not-prose mt-4">
                <a
                  href="/docs/api.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="h-4 w-4" />
                  {t('integrations.fullDocs', 'View full API documentation (Markdown)')}
                </a>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ===== CREATE API KEY DIALOG ===== */}
      <Dialog open={showCreateKeyDialog} onOpenChange={setShowCreateKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('integrations.createApiKey', 'Create API Key')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('integrations.keyName', 'Key Name')}</Label>
              <Input
                className="mt-1"
                placeholder="e.g., My App, Zapier, CI/CD"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-2 block">{t('integrations.scopes', 'Scopes')}</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={newKeyScopes.includes('read')}
                    onCheckedChange={(c) =>
                      setNewKeyScopes((prev) =>
                        c ? [...prev, 'read'] : prev.filter((s) => s !== 'read'),
                      )
                    }
                  />
                  Read
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={newKeyScopes.includes('write')}
                    onCheckedChange={(c) =>
                      setNewKeyScopes((prev) =>
                        c ? [...prev, 'write'] : prev.filter((s) => s !== 'write'),
                      )
                    }
                  />
                  Write
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateKeyDialog(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button onClick={handleCreateApiKey} disabled={!newKeyName.trim()}>
              <Plus className="h-4 w-4 mr-1" /> {t('integrations.create', 'Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== KEY CREATED DIALOG (show once) ===== */}
      <Dialog open={!!lastCreatedKey} onOpenChange={(open) => { if (!open) { setLastCreatedKey(null); setShowKey(false) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('integrations.keyCreated', 'API Key Created')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t('integrations.copyWarning', 'Copy this key now. For security, it won\'t be displayed again.')}
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-lg border bg-muted/50 p-3 font-mono text-sm break-all">
                {showKey ? lastCreatedKey : '••••••••••••••••••••••••••••••••••'}
              </div>
              <div className="flex flex-col gap-1">
                <Button variant="ghost" size="sm" onClick={() => setShowKey(!showKey)}>
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleCopyKey}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => { setLastCreatedKey(null); setShowKey(false) }}>
              {t('integrations.done', 'Done')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== CREATE WEBHOOK DIALOG ===== */}
      <Dialog open={showCreateWebhookDialog} onOpenChange={setShowCreateWebhookDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('integrations.createWebhook', 'Add Webhook Endpoint')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('integrations.webhookUrl', 'Endpoint URL')}</Label>
              <Input
                className="mt-1"
                placeholder="https://api.example.com/webhook"
                value={newWebhookUrl}
                onChange={(e) => setNewWebhookUrl(e.target.value)}
              />
            </div>
            <div>
              <Label>{t('integrations.description', 'Description (optional)')}</Label>
              <Input
                className="mt-1"
                placeholder="e.g., Zapier trigger, Slack notification"
                value={newWebhookDesc}
                onChange={(e) => setNewWebhookDesc(e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-2 block">{t('integrations.events', 'Events')}</Label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(WEBHOOK_EVENT_LABELS) as [WebhookEvent, string][]).map(
                  ([event, label]) => (
                    <label key={event} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={newWebhookEvents.includes(event)}
                        onCheckedChange={() => toggleWebhookEvent(event)}
                      />
                      {label}
                    </label>
                  ),
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateWebhookDialog(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button onClick={handleCreateWebhook} disabled={!newWebhookUrl.trim() || newWebhookEvents.length === 0}>
              <Plus className="h-4 w-4 mr-1" /> {t('integrations.add', 'Add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
