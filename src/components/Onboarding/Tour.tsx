import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

const TOUR_STORAGE_KEY = 'lifeos_tour_completed'

const STEPS = [
  { id: 'welcome', target: null, titleKey: 'onboarding.tour.welcome', bodyKey: 'onboarding.tour.welcomeBody' },
  { id: 'warroom', target: 'main-content', titleKey: 'onboarding.tour.warroom', bodyKey: 'onboarding.tour.warroomBody' },
  { id: 'consultant', target: null, titleKey: 'onboarding.tour.consultant', bodyKey: 'onboarding.tour.consultantBody' },
  { id: 'opportunities', target: null, titleKey: 'onboarding.tour.opportunities', bodyKey: 'onboarding.tour.opportunitiesBody' },
  { id: 'journal', target: null, titleKey: 'onboarding.tour.journal', bodyKey: 'onboarding.tour.journalBody' },
]

export function Tour() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [dontShowAgain, setDontShowAgain] = useState(false)

  useEffect(() => {
    const completed = localStorage.getItem(TOUR_STORAGE_KEY)
    if (completed === 'true') return
    const timer = setTimeout(() => setOpen(true), 800)
    return () => clearTimeout(timer)
  }, [])

  const handleClose = useCallback(() => {
    if (dontShowAgain) localStorage.setItem(TOUR_STORAGE_KEY, 'true')
    setOpen(false)
  }, [dontShowAgain])

  const current = STEPS[step]
  if (!current) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={handleClose}>
        <DialogHeader>
          <DialogTitle>
            {t(current.titleKey)}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {t(current.bodyKey)}
        </p>
        <div className="flex items-center space-x-2 py-2">
          <Checkbox
            id="dont-show"
            checked={dontShowAgain}
            onCheckedChange={(v) => setDontShowAgain(v === true)}
          />
          <Label htmlFor="dont-show" className="text-sm">{t('onboarding.dontShowAgain')}</Label>
        </div>
        <DialogFooter>
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
              {t('common.back')}
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)}>{t('common.next')}</Button>
          ) : (
            <Button onClick={handleClose}>{t('onboarding.finish')}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
