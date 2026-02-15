import { Badge } from '@/components/ui/badge'
import { Bot, Sparkles, Zap } from 'lucide-react'
import type { NightWorkerProvider } from '@/types/night-worker'
import { cn } from '@/lib/utils'

interface Props {
  provider: NightWorkerProvider
  className?: string
  compact?: boolean
}

const PROVIDER_STYLES: Record<string, { label: string; className: string; icon: typeof Bot }> = {
  codex: { label: 'Codex', className: 'border-blue-500/40 bg-blue-500/10 text-blue-200', icon: Bot },
  codex_cli: { label: 'Codex CLI', className: 'border-blue-500/40 bg-blue-500/10 text-blue-200', icon: Bot },
  claude: { label: 'Claude', className: 'border-purple-500/40 bg-purple-500/10 text-purple-200', icon: Sparkles },
  claude_cli: { label: 'Claude CLI', className: 'border-purple-500/40 bg-purple-500/10 text-purple-200', icon: Sparkles },
  gemini: { label: 'Gemini', className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200', icon: Zap },
  gemini_cli: { label: 'Gemini CLI', className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200', icon: Zap },
}

export function ProviderBadge({ provider, className, compact }: Props) {
  const meta = PROVIDER_STYLES[provider] ?? { label: provider, className: 'border-slate-500/40 bg-slate-500/10 text-slate-200', icon: Bot }
  const Icon = meta.icon
  return (
    <Badge
      variant="outline"
      className={cn(
        'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
        meta.className,
        compact && 'px-2 py-0.5',
        className
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
      <span className="capitalize">{meta.label}</span>
    </Badge>
  )
}
