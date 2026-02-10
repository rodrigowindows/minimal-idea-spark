import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Inbox } from 'lucide-react'
import { toast } from 'sonner'
import {
  getDigestPreferences,
  setDigestPreferences,
  type DigestPreferences,
  type DigestFrequency,
} from '@/lib/email/digest'

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function DigestSettings() {
  const { t } = useTranslation()
  const [prefs, setPrefs] = useState<DigestPreferences>(() => getDigestPreferences())

  function update(partial: Partial<DigestPreferences>) {
    const updated = { ...prefs, ...partial }
    setPrefs(updated)
    setDigestPreferences(partial)
    toast.success(t('common.saved'))
  }

  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Inbox className="h-5 w-5 text-primary" />
          Email Digest
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Receive periodic email summaries of your opportunities, journal wins, and metrics.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="digest-enabled" className="text-sm font-medium">Enable digest</Label>
            <p className="text-xs text-muted-foreground">Receive email summaries</p>
          </div>
          <Switch
            id="digest-enabled"
            checked={prefs.enabled}
            onCheckedChange={(enabled) => update({ enabled })}
          />
        </div>

        {prefs.enabled && (
          <>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Frequency</Label>
              <Select
                value={prefs.frequency}
                onValueChange={(v: DigestFrequency) => update({ frequency: v })}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Preferred time</Label>
              <Input
                type="time"
                value={prefs.preferredTime}
                onChange={(e) => update({ preferredTime: e.target.value || '08:00' })}
                className="w-40 h-8"
              />
            </div>

            {prefs.frequency === 'weekly' && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Preferred day</Label>
                <Select
                  value={String(prefs.preferredDay)}
                  onValueChange={(v) => update({ preferredDay: parseInt(v, 10) })}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAY_LABELS.map((label, i) => (
                      <SelectItem key={i} value={String(i)}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-3 pt-2 border-t border-border/50">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Digest content
              </Label>
              <div className="flex items-center justify-between">
                <Label htmlFor="digest-opp" className="text-sm">Opportunities</Label>
                <Switch
                  id="digest-opp"
                  checked={prefs.includeOpportunities}
                  onCheckedChange={(v) => update({ includeOpportunities: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="digest-journal" className="text-sm">Journal highlights</Label>
                <Switch
                  id="digest-journal"
                  checked={prefs.includeJournal}
                  onCheckedChange={(v) => update({ includeJournal: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="digest-metrics" className="text-sm">Metrics & XP</Label>
                <Switch
                  id="digest-metrics"
                  checked={prefs.includeMetrics}
                  onCheckedChange={(v) => update({ includeMetrics: v })}
                />
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
