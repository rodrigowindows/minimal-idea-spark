import { cn } from '@/lib/utils'
import { XPProgressBar } from '@/components/gamification/XPProgressBar'

interface SidebarXPBarProps {
  collapsed: boolean
}

export function SidebarXPBar({ collapsed }: SidebarXPBarProps) {
  return (
    <div className={cn('px-2 py-3', collapsed && 'px-1')}>
      <XPProgressBar compact={collapsed} />
    </div>
  )
}

