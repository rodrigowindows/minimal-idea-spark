import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  LayoutDashboard,
  MessageSquare,
  Target,
  BookOpen,
  Sparkles,
  Zap,
  Brain,
  FileStack,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const TOUR_STORAGE_KEY = 'lifeos_tour_completed'

interface TourStep {
  id: string
  titleKey: string
  bodyKey: string
  icon: typeof LayoutDashboard
  route?: string
  highlightSelector?: string
  position?: 'center' | 'bottom-right' | 'top-right'
}

const STEPS: TourStep[] = [
  {
    id: 'welcome',
    titleKey: 'onboarding.tour.welcome',
    bodyKey: 'onboarding.tour.welcomeBody',
    icon: Sparkles,
    position: 'center',
  },
  {
    id: 'warroom',
    titleKey: 'onboarding.tour.warroom',
    bodyKey: 'onboarding.tour.warroomBody',
    icon: LayoutDashboard,
    route: '/',
    highlightSelector: '#main-content',
    position: 'bottom-right',
  },
  {
    id: 'consultant',
    titleKey: 'onboarding.tour.consultant',
    bodyKey: 'onboarding.tour.consultantBody',
    icon: MessageSquare,
    route: '/consultant',
    position: 'bottom-right',
  },
  {
    id: 'opportunities',
    titleKey: 'onboarding.tour.opportunities',
    bodyKey: 'onboarding.tour.opportunitiesBody',
    icon: Target,
    route: '/opportunities',
    position: 'bottom-right',
  },
  {
    id: 'journal',
    titleKey: 'onboarding.tour.journal',
    bodyKey: 'onboarding.tour.journalBody',
    icon: BookOpen,
    route: '/journal',
    position: 'bottom-right',
  },
  {
    id: 'rag',
    titleKey: 'onboarding.tour.rag',
    bodyKey: 'onboarding.tour.ragBody',
    icon: Brain,
    position: 'center',
  },
  {
    id: 'automation',
    titleKey: 'onboarding.tour.automation',
    bodyKey: 'onboarding.tour.automationBody',
    icon: Zap,
    position: 'center',
  },
  {
    id: 'templates',
    titleKey: 'onboarding.tour.templates',
    bodyKey: 'onboarding.tour.templatesBody',
    icon: FileStack,
    position: 'center',
  },
]

interface TourProps {
  forceOpen?: boolean
  onClose?: () => void
}

export function Tour({ forceOpen, onClose }: TourProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (forceOpen) {
      setStep(0)
      setOpen(true)
      return
    }
    const completed = localStorage.getItem(TOUR_STORAGE_KEY)
    if (completed === 'true') return
    const timer = setTimeout(() => setOpen(true), 800)
    return () => clearTimeout(timer)
  }, [forceOpen])

  const handleClose = useCallback(() => {
    if (dontShowAgain) localStorage.setItem(TOUR_STORAGE_KEY, 'true')
    setOpen(false)
    onClose?.()
  }, [dontShowAgain, onClose])

  const handleFinish = useCallback(() => {
    localStorage.setItem(TOUR_STORAGE_KEY, 'true')
    setOpen(false)
    navigate('/')
    onClose?.()
  }, [navigate, onClose])

  const goNext = useCallback(() => {
    const nextStep = step + 1
    if (nextStep >= STEPS.length) {
      handleFinish()
      return
    }
    setStep(nextStep)
    const next = STEPS[nextStep]
    if (next.route) navigate(next.route)
  }, [step, navigate, handleFinish])

  const goPrev = useCallback(() => {
    const prevStep = step - 1
    if (prevStep < 0) return
    setStep(prevStep)
    const prev = STEPS[prevStep]
    if (prev.route) navigate(prev.route)
  }, [step, navigate])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, handleClose, goNext, goPrev])

  if (!open) return null

  const current = STEPS[step]
  if (!current) return null

  const Icon = current.icon
  const progress = ((step + 1) / STEPS.length) * 100

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label={t(current.titleKey)}>
      {/* Backdrop overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Tour card */}
      <div
        ref={dialogRef}
        className={cn(
          'absolute z-10 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl transition-all duration-300',
          current.position === 'center' && 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
          current.position === 'bottom-right' && 'bottom-8 right-8 max-sm:bottom-4 max-sm:right-4 max-sm:left-4 max-sm:max-w-none',
          current.position === 'top-right' && 'top-20 right-8'
        )}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={t('common.close')}
        >
          <X className="h-4 w-4" />
        </button>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span>{step + 1}/{STEPS.length}</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        {/* Icon + Title */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold">{t(current.titleKey)}</h2>
        </div>

        {/* Body */}
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          {t(current.bodyKey)}
        </p>

        {/* Don't show again */}
        <div className="flex items-center space-x-2 mb-4">
          <Checkbox
            id="tour-dont-show"
            checked={dontShowAgain}
            onCheckedChange={(v) => setDontShowAgain(v === true)}
          />
          <Label htmlFor="tour-dont-show" className="text-xs text-muted-foreground">
            {t('onboarding.dontShowAgain')}
          </Label>
        </div>

        {/* Navigation dots */}
        <div className="flex items-center justify-center gap-1.5 mb-4">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setStep(i)
                const s = STEPS[i]
                if (s.route) navigate(s.route)
              }}
              className={cn(
                'h-2 w-2 rounded-full transition-all',
                i === step ? 'bg-primary w-4' : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
              )}
              aria-label={`${t('onboarding.tour.step')} ${i + 1}`}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={goPrev}
            disabled={step === 0}
          >
            {t('common.back')}
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleClose}>
              {t('onboarding.tour.skip')}
            </Button>
            {step < STEPS.length - 1 ? (
              <Button size="sm" onClick={goNext}>
                {t('common.next')}
              </Button>
            ) : (
              <Button size="sm" onClick={handleFinish}>
                {t('onboarding.finish')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
