import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Sparkles, Rocket, Target, BookOpen, MessageSquare, Keyboard } from 'lucide-react'

const WELCOME_DISMISSED_KEY = 'lifeos_welcome_dismissed'

interface WelcomeModalProps {
  onStartTour?: () => void
}

export function WelcomeModal({ onStartTour }: WelcomeModalProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [dontShow, setDontShow] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem(WELCOME_DISMISSED_KEY)
    if (!dismissed) setOpen(true)
  }, [])

  const handleClose = () => {
    if (dontShow) localStorage.setItem(WELCOME_DISMISSED_KEY, '1')
    setOpen(false)
  }

  const handleStartTour = () => {
    localStorage.setItem(WELCOME_DISMISSED_KEY, '1')
    setOpen(false)
    onStartTour?.()
  }

  const features = [
    { icon: Target, labelKey: 'onboarding.welcome.featureWarRoom' },
    { icon: MessageSquare, labelKey: 'onboarding.welcome.featureConsultant' },
    { icon: Rocket, labelKey: 'onboarding.welcome.featureOpportunities' },
    { icon: BookOpen, labelKey: 'onboarding.welcome.featureJournal' },
  ]

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-6 w-6 text-primary" />
            {t('onboarding.welcome.title')}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {t('onboarding.welcome.description')}
        </p>
        <div className="grid grid-cols-2 gap-3 py-2">
          {features.map((f) => (
            <div
              key={f.labelKey}
              className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 p-3"
            >
              <f.icon className="h-4 w-4 shrink-0 text-primary" />
              <span className="text-xs font-medium">{t(f.labelKey)}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 border border-border/30 px-3 py-2">
          <Keyboard className="h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            {t('onboarding.welcome.shortcutHint')}
          </p>
        </div>
        <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              id="welcome-dont-show"
              checked={dontShow}
              onCheckedChange={(v) => setDontShow(v === true)}
            />
            <span>{t('onboarding.dontShowAgain')}</span>
          </label>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              {t('onboarding.welcome.skipTour')}
            </Button>
            <Button onClick={handleStartTour}>
              {t('onboarding.welcome.startTour')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
