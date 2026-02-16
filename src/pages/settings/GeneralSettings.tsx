import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell, Languages, Palette, Shield } from 'lucide-react'
import { toast } from 'sonner'

import { useLanguage, type Language } from '@/contexts/LanguageContext'
import { getSessionTimeoutMs } from '@/lib/auth/session-utils'
import { getStorageValue, setStorageValue } from '@/lib/storage'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { ShortcutSettings } from '@/components/settings/ShortcutSettings'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

const LANGUAGE_OPTIONS: { value: Language; label: string; flag: string }[] = [
  { value: 'pt-BR', label: 'Português (Brasil)', flag: '🇧🇷' },
  { value: 'en', label: 'English', flag: '🇺🇸' },
  { value: 'es', label: 'Español', flag: '🇪🇸' },
]

export function GeneralSettings() {
  const { t } = useTranslation()
  const { language, setLanguage } = useLanguage()

  const [remindersEnabled, setRemindersEnabled] = useState(() => getStorageValue('lifeos_reminders_enabled', 'true') !== 'false')
  const [journalReminderEnabled, setJournalReminderEnabled] = useState(
    () => getStorageValue('lifeos_journal_reminder_enabled', 'true') !== 'false',
  )
  const [advanceReminderDays, setAdvanceReminderDays] = useState(() => {
    const raw = getStorageValue('lifeos_reminder_advance_days', '1')
    const parsed = Number.parseInt(raw, 10)
    return Number.isFinite(parsed) ? parsed : 1
  })
  const [calendarSyncEnabled, setCalendarSyncEnabled] = useState(
    () => getStorageValue('lifeos_calendar_sync_deadlines', 'true') !== 'false',
  )

  return (
    <>
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
            {LANGUAGE_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={language === option.value ? 'default' : 'outline'}
                size="sm"
                className="gap-2"
                onClick={() => setLanguage(option.value)}
              >
                <span>{option.flag}</span>
                <span>{option.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

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
            onValueChange={(value) => {
              const minutes = Number.parseInt(value, 10)
              setStorageValue('lifeos_session_timeout_min', String(minutes))
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

      <ShortcutSettings />

      <Card className="rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-primary" />
            {t('settings.reminders')}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t('settings.remindersDescription')}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="reminders-toggle" className="text-sm font-medium">
              {t('settings.remindersInApp')}
            </Label>
            <Switch
              id="reminders-toggle"
              checked={remindersEnabled}
              onCheckedChange={(checked) => {
                setRemindersEnabled(checked)
                setStorageValue('lifeos_reminders_enabled', String(checked))
                toast.success(t('common.saved'))
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="journal-reminder-toggle" className="text-sm font-medium">
                Journal daily reminder
              </Label>
              <p className="text-xs text-muted-foreground">
                Get reminded to write in your journal every evening
              </p>
            </div>
            <Switch
              id="journal-reminder-toggle"
              checked={journalReminderEnabled}
              onCheckedChange={(checked) => {
                setJournalReminderEnabled(checked)
                setStorageValue('lifeos_journal_reminder_enabled', String(checked))
                toast.success(t('common.saved'))
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="calendar-sync-toggle" className="text-sm font-medium">
                Sync deadlines to calendar
              </Label>
              <p className="text-xs text-muted-foreground">
                Auto-create calendar events for opportunity due dates
              </p>
            </div>
            <Switch
              id="calendar-sync-toggle"
              checked={calendarSyncEnabled}
              onCheckedChange={(checked) => {
                setCalendarSyncEnabled(checked)
                setStorageValue('lifeos_calendar_sync_deadlines', String(checked))
                toast.success(t('common.saved'))
              }}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Advance reminder (days before due)</Label>
            <p className="text-xs text-muted-foreground">
              Get notified this many days before a task is due
            </p>
            <Select
              value={String(advanceReminderDays)}
              onValueChange={(value) => {
                const days = Number.parseInt(value, 10)
                setAdvanceReminderDays(days)
                setStorageValue('lifeos_reminder_advance_days', String(days))
                toast.success(t('common.saved'))
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Same day only</SelectItem>
                <SelectItem value="1">1 day before</SelectItem>
                <SelectItem value="2">2 days before</SelectItem>
                <SelectItem value="3">3 days before</SelectItem>
                <SelectItem value="7">1 week before</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

