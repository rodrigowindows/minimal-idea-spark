import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface BackButtonProps {
  fallbackTo?: string
  className?: string
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive' | 'secondary'
}

/**
 * Botão "Voltar" que usa navigate(-1) com fallback (prompt 35).
 * Use em PageHeader quando aplicável.
 */
export function BackButton({ fallbackTo = '/', className, variant = 'ghost' }: BackButtonProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  const handleBack = () => {
    if (window.history.length > 1 && location.key !== 'default') {
      navigate(-1)
    } else {
      navigate(fallbackTo)
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      className={className}
      onClick={handleBack}
      aria-label={t('common.back')}
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      <span className="ml-1">{t('common.back')}</span>
    </Button>
  )
}
