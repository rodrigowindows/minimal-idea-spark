import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell, LogOut, Shield } from 'lucide-react'
import { toast } from 'sonner'

import { useAuth } from '@/contexts/AuthContext'

import { useNotifications } from '@/hooks/useNotifications'
import { signOutAllDevices } from '@/lib/auth/sessions'
import { Enable2FAModal } from '@/components/Security/Enable2FAModal'
import { SessionsList } from '@/components/Security/SessionsList'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

export function SecuritySettings() {
  const { t } = useTranslation()
  const { user, signOut } = useAuth()
  const { logActivity } = useWorkspaceContext()
  const { preferences: notifPrefs, updatePreferences } = useNotifications()
  const [security2FAOpen, setSecurity2FAOpen] = useState(false)

  return (
    <>
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
            <p className="mb-1 text-sm font-medium">{t('settings.twoFactor')}</p>
            <Button variant="outline" size="sm" onClick={() => setSecurity2FAOpen(true)}>
              {t('settings.enable2FA')}
            </Button>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">{t('settings.sessions')}</p>
            <SessionsList />
          </div>
          <div>
            <p className="mb-1 text-sm font-medium">Sair de todos os dispositivos</p>
            <p className="mb-2 text-xs text-muted-foreground">
              Encerra todas as sessões ativas, incluindo este dispositivo.
            </p>
            <Button
              variant="destructive"
              size="sm"
              className="gap-2"
              onClick={async () => {
                if (!window.confirm('Tem certeza? Você será deslogado de todos os dispositivos.')) return
                logActivity('session.signout_all', 'session', undefined, { device: 'all' })
                const { error } = await signOutAllDevices()
                if (error) {
                  toast.error(error)
                  return
                }
                toast.success('Todas as sessões foram encerradas')
                setTimeout(() => window.location.reload(), 1000)
              }}
            >
              <LogOut className="h-4 w-4" />
              Sair de Todos os Dispositivos
            </Button>
          </div>
        </CardContent>
      </Card>
      <Enable2FAModal open={security2FAOpen} onOpenChange={setSecurity2FAOpen} />

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
              {t('settings.loggedAs')}:{' '}
              <span className="font-medium text-foreground">{user.email}</span>
            </p>
          )}
          <Button variant="outline" onClick={signOut} className="w-full gap-2">
            <LogOut className="h-4 w-4" />
            {t('settings.signOut')}
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-primary" />
            {t('nav.notifications')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t('settings.enableNotifications')}</p>
              <p className="text-xs text-muted-foreground">{t('settings.receiveNotifications')}</p>
            </div>
            <Switch
              checked={notifPrefs.enabled}
              onCheckedChange={(enabled) => updatePreferences({ enabled })}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('settings.channels')}
            </Label>
            {(['in_app', 'push', 'email'] as const).map((channel) => (
              <div key={channel} className="flex items-center justify-between rounded-lg bg-muted/50 p-2">
                <span className="text-sm capitalize">{channel.replace('_', '-')}</span>
                <Switch
                  checked={notifPrefs.channels[channel]}
                  onCheckedChange={(value) =>
                    updatePreferences({
                      channels: { ...notifPrefs.channels, [channel]: value },
                    })
                  }
                />
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('settings.notificationTypes')}
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(notifPrefs.types).map(([type, enabled]) => (
                <div key={type} className="flex items-center justify-between rounded-lg bg-muted/50 p-2">
                  <span className="text-xs capitalize">{type.replace(/_/g, ' ')}</span>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(value) =>
                      updatePreferences({
                        types: { ...notifPrefs.types, [type]: value },
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('settings.quietHours')}
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t('settings.start')}</Label>
                <Input
                  type="time"
                  value={notifPrefs.quietHoursStart ?? ''}
                  onChange={(event) =>
                    updatePreferences({ quietHoursStart: event.target.value || null })
                  }
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t('settings.end')}</Label>
                <Input
                  type="time"
                  value={notifPrefs.quietHoursEnd ?? ''}
                  onChange={(event) => updatePreferences({ quietHoursEnd: event.target.value || null })}
                  className="h-8"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('settings.digest')}
            </Label>
            <Select
              value={notifPrefs.digestFrequency}
              onValueChange={(value) =>
                updatePreferences({ digestFrequency: value as 'none' | 'daily' | 'weekly' })
              }
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

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t('settings.groupSimilar')}</p>
              <p className="text-xs text-muted-foreground">{t('settings.groupByType')}</p>
            </div>
            <Switch
              checked={notifPrefs.groupSimilar}
              onCheckedChange={(groupSimilar) => updatePreferences({ groupSimilar })}
            />
          </div>
        </CardContent>
      </Card>
    </>
  )
}

