import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Mail, Copy, RefreshCw, Info } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import {
  getOrCreateCaptureSettings,
  toggleCaptureEmail,
  regenerateCaptureEmail,
  type EmailCaptureSettings as CaptureSettings,
} from '@/lib/email/capture-settings'
import { generateCaptureEmail } from '@/lib/email/inbound'

export function EmailCaptureSettings() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [settings, setSettings] = useState<CaptureSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const userId = user?.id ?? 'mock-user-001'
    getOrCreateCaptureSettings(userId).then((s) => {
      setSettings(s)
      setLoading(false)
    }).catch(() => {
      // Fallback: generate locally
      setSettings({
        captureEmail: generateCaptureEmail(userId),
        isActive: true,
        rateLimitPerHour: 20,
      })
      setLoading(false)
    })
  }, [user])

  function handleCopy() {
    if (!settings) return
    navigator.clipboard.writeText(settings.captureEmail).then(() => {
      toast.success(t('common.copied', 'Copied to clipboard'))
    }).catch(() => {
      toast.error(t('common.copyFailed', 'Failed to copy'))
    })
  }

  async function handleToggle(active: boolean) {
    if (!settings) return
    const userId = user?.id ?? 'mock-user-001'
    setSettings({ ...settings, isActive: active })
    await toggleCaptureEmail(userId, active)
    toast.success(t('common.saved'))
  }

  async function handleRegenerate() {
    if (!settings) return
    if (!window.confirm('Regenerate your capture email? The old address will stop working.')) return
    const userId = user?.id ?? 'mock-user-001'
    const newEmail = await regenerateCaptureEmail(userId)
    setSettings({ ...settings, captureEmail: newEmail })
    toast.success('New capture email generated')
  }

  if (loading) {
    return (
      <Card className="rounded-xl">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">Loading...</CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Mail className="h-5 w-5 text-primary" />
          Email Capture
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Send emails to your unique capture address to create opportunities or journal entries automatically.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="capture-active" className="text-sm font-medium">Active</Label>
          <Switch
            id="capture-active"
            checked={settings?.isActive ?? false}
            onCheckedChange={handleToggle}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Your capture email</Label>
          <div className="flex gap-2">
            <Input
              readOnly
              value={settings?.captureEmail ?? ''}
              className="font-mono text-sm bg-muted/50"
            />
            <Button variant="outline" size="icon" onClick={handleCopy} title="Copy">
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleRegenerate} title="Regenerate">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="rounded-lg bg-muted/50 p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Info className="h-4 w-4 text-muted-foreground" />
            How it works
          </div>
          <ul className="text-xs text-muted-foreground space-y-1 ml-6 list-disc">
            <li>Send an email to your capture address from your registered email</li>
            <li>Subject becomes the title; body becomes the description</li>
            <li>Use <code className="bg-muted px-1 rounded">#tag</code> in the body to auto-tag</li>
            <li>Include "journal" or "diario" in the subject for journal entries</li>
            <li>Use <code className="bg-muted px-1 rounded">!priority:N</code> (1-10) to set priority</li>
            <li>Attachments are included as links</li>
          </ul>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Rate limit</span>
          <Badge variant="secondary">{settings?.rateLimitPerHour ?? 20}/hour</Badge>
        </div>
      </CardContent>
    </Card>
  )
}
