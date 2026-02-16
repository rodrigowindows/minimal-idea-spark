import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, Plus, Save, Target } from 'lucide-react'
import { toast } from 'sonner'

import { useLocalData } from '@/hooks/useLocalData'
import { DEFAULT_DOMAIN_COLORS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type WeeklyTargetDraft = Record<string, { opp: number; hours: number }>

export function DomainSettings() {
  const { t } = useTranslation()
  const { domains, addDomain, weeklyTargets, setWeeklyTarget } = useLocalData()

  const [showDomainDialog, setShowDomainDialog] = useState(false)
  const [newDomainName, setNewDomainName] = useState('')
  const [newDomainColor, setNewDomainColor] = useState<string>(DEFAULT_DOMAIN_COLORS[0])
  const [newDomainTarget, setNewDomainTarget] = useState(20)
  const [editingTargets, setEditingTargets] = useState<WeeklyTargetDraft>(() => {
    const initial: WeeklyTargetDraft = {}
    weeklyTargets.forEach((weeklyTarget) => {
      initial[weeklyTarget.domain_id] = {
        opp: weeklyTarget.opportunities_target,
        hours: weeklyTarget.hours_target,
      }
    })
    return initial
  })

  function handleSaveWeeklyTargets() {
    Object.entries(editingTargets).forEach(([domainId, draft]) => {
      if (draft.opp > 0 || draft.hours > 0) {
        setWeeklyTarget(domainId, draft.opp, draft.hours)
      }
    })
    toast.success(t('settings.weeklyGoalsSaved'))
  }

  function handleAddDomain(event: React.FormEvent) {
    event.preventDefault()
    if (!newDomainName.trim()) return

    const name = newDomainName.trim()
    addDomain(name, newDomainColor, newDomainTarget)
    toast.success(t('settings.domainCreated', { name }))

    setNewDomainName('')
    setNewDomainColor(DEFAULT_DOMAIN_COLORS[0])
    setNewDomainTarget(20)
    setShowDomainDialog(false)
  }

  return (
    <>
      <Card className="rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <span className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              {t('settings.lifeDomains')}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => setShowDomainDialog(true)}
            >
              <Plus className="h-3 w-3" />
              {t('settings.add')}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {domains.map((domain) => (
            <div key={domain.id} className="flex items-center gap-3 rounded-lg bg-muted/50 p-2">
              <span
                className="h-4 w-4 shrink-0 rounded-full"
                style={{ backgroundColor: domain.color_theme }}
              />
              <div className="flex-1">
                <p className="text-sm font-medium">{domain.name}</p>
                {domain.target_percentage != null && domain.target_percentage > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {t('settings.target')}: {domain.target_percentage}%
                  </p>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <span className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              {t('settings.weeklyGoals')}
            </span>
            <Button size="sm" className="gap-1" onClick={handleSaveWeeklyTargets}>
              <Save className="h-3 w-3" />
              {t('settings.save')}
            </Button>
          </CardTitle>
          <p className="text-xs text-muted-foreground">{t('settings.weeklyGoalsDescription')}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {domains.map((domain) => {
            const current = editingTargets[domain.id] || { opp: 0, hours: 0 }
            return (
              <div key={domain.id} className="space-y-2 rounded-lg bg-muted/50 p-3">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: domain.color_theme }}
                  />
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
                      onChange={(event) =>
                        setEditingTargets((prev) => ({
                          ...prev,
                          [domain.id]: {
                            ...(prev[domain.id] || { opp: 0, hours: 0 }),
                            opp: Number(event.target.value),
                          },
                        }))
                      }
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
                      onChange={(event) =>
                        setEditingTargets((prev) => ({
                          ...prev,
                          [domain.id]: {
                            ...(prev[domain.id] || { opp: 0, hours: 0 }),
                            hours: Number(event.target.value),
                          },
                        }))
                      }
                      className="h-8"
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

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
                onChange={(event) => setNewDomainName(event.target.value)}
                placeholder={t('settings.domainPlaceholder')}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{t('settings.color')}</Label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_DOMAIN_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewDomainColor(color)}
                    className={cn(
                      'h-8 w-8 rounded-full transition-all',
                      newDomainColor === color &&
                        'ring-2 ring-primary ring-offset-2 ring-offset-background',
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
                onChange={(event) => setNewDomainTarget(Number(event.target.value))}
              />
              <p className="text-xs text-muted-foreground">{t('settings.targetDescription')}</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDomainDialog(false)}>
                {t('settings.cancel')}
              </Button>
              <Button type="submit" disabled={!newDomainName.trim()}>
                {t('settings.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

