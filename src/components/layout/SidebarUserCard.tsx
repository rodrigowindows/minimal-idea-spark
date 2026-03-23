import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface SidebarUserCardProps {
  collapsed: boolean
}

export function SidebarUserCard({ collapsed }: SidebarUserCardProps) {
  const { user, signOut } = useAuth()
  const { profile } = useProfile()
  const navigate = useNavigate()

  if (!user) return null

  const displayName = profile?.display_name || user.email?.split('@')[0] || '?'
  const initials = displayName
    .split(/[\s@]/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('')

  const handleNavigateProfile = () => navigate('/profile')

  const card = (
    <div
      className={cn(
        'flex items-center border-t border-border/50 p-2',
        collapsed ? 'justify-center' : 'gap-3 px-3',
      )}
    >
      <button
        onClick={handleNavigateProfile}
        className="shrink-0 rounded-full ring-offset-background transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label="Ir para perfil"
      >
        <Avatar className={cn('border border-border', collapsed ? 'h-8 w-8' : 'h-9 w-9')}>
          <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
      </button>

      {!collapsed && (
        <>
          <button
            onClick={handleNavigateProfile}
            className="min-w-0 flex-1 text-left transition-opacity hover:opacity-80"
          >
            <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </button>

          <button
            onClick={() => void signOut()}
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            aria-label="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{card}</TooltipTrigger>
        <TooltipContent side="right">
          <p className="font-medium">{displayName}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return card
}
