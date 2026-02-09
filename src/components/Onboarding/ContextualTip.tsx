import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'

const TIPS_SEEN_KEY = 'lifeos_contextual_tips_seen'

function getSeenTips(): string[] {
  try {
    const raw = localStorage.getItem(TIPS_SEEN_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function markSeen(tipId: string) {
  const seen = getSeenTips()
  if (!seen.includes(tipId)) {
    seen.push(tipId)
    localStorage.setItem(TIPS_SEEN_KEY, JSON.stringify(seen))
  }
}

interface ContextualTipProps {
  tipId: string
  titleKey: string
  descriptionKey: string
  className?: string
  variant?: 'inline' | 'floating'
  delay?: number
}

export function ContextualTip({
  tipId,
  titleKey,
  descriptionKey,
  className,
  variant = 'inline',
  delay = 500,
}: ContextualTipProps) {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const seen = getSeenTips()
    if (seen.includes(tipId)) return
    const timer = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(timer)
  }, [tipId, delay])

  const handleDismiss = () => {
    markSeen(tipId)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className={cn(
        'relative rounded-lg border border-primary/20 bg-primary/5 p-3 transition-all animate-in fade-in slide-in-from-top-2',
        variant === 'floating' && 'shadow-lg',
        className
      )}
      role="note"
      aria-label={t(titleKey)}
    >
      <button
        onClick={handleDismiss}
        className="absolute right-2 top-2 rounded-md p-0.5 text-muted-foreground hover:text-foreground transition-colors"
        aria-label={t('common.close')}
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="flex items-start gap-2 pr-5">
        <Lightbulb className="h-4 w-4 shrink-0 text-primary mt-0.5" />
        <div>
          <p className="text-xs font-medium mb-0.5">{t(titleKey)}</p>
          <p className="text-xs text-muted-foreground">{t(descriptionKey)}</p>
        </div>
      </div>
    </div>
  )
}
