import { useMemo } from 'react'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PasswordStrengthMeterProps {
  password: string
}

interface Requirement {
  label: string
  test: (pwd: string) => boolean
}

const requirements: Requirement[] = [
  { label: 'Mínimo 8 caracteres', test: (pwd) => pwd.length >= 8 },
  { label: 'Uma letra maiúscula', test: (pwd) => /[A-Z]/.test(pwd) },
  { label: 'Uma letra minúscula', test: (pwd) => /[a-z]/.test(pwd) },
  { label: 'Um número', test: (pwd) => /\d/.test(pwd) },
  { label: 'Um caractere especial (!@#$%)', test: (pwd) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd) },
]

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const { score, passed } = useMemo(() => {
    const results = requirements.map((req) => req.test(password))
    return {
      score: results.filter(Boolean).length,
      passed: results,
    }
  }, [password])

  const percentage = (score / requirements.length) * 100

  const strengthLabel = useMemo(() => {
    if (score <= 1) return { text: 'Muito fraca', color: 'text-destructive' }
    if (score <= 2) return { text: 'Fraca', color: 'text-destructive' }
    if (score <= 3) return { text: 'Razoável', color: 'text-warning' }
    if (score <= 4) return { text: 'Forte', color: 'text-success' }
    return { text: 'Muito forte', color: 'text-success' }
  }, [score])

  const progressColor = useMemo(() => {
    if (score <= 2) return 'bg-destructive'
    if (score <= 3) return 'bg-warning'
    return 'bg-success'
  }, [score])

  if (!password) return null

  return (
    <div className="space-y-3 pt-1">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Força da senha</span>
          <span className={cn('font-medium', strengthLabel.color)}>
            {strengthLabel.text}
          </span>
        </div>
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={cn('h-full transition-all duration-300', progressColor)}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      <ul className="grid gap-1 text-xs">
        {requirements.map((req, i) => (
          <li
            key={req.label}
            className={cn(
              'flex items-center gap-1.5 transition-colors',
              passed[i] ? 'text-success' : 'text-muted-foreground'
            )}
          >
            {passed[i] ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <X className="h-3.5 w-3.5" />
            )}
            {req.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function isPasswordStrong(password: string): boolean {
  return requirements.every((req) => req.test(password))
}
