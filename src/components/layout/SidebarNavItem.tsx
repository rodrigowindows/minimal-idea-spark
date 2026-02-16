import { LayoutDashboard, Star } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

import type { SidebarItem } from './sidebarConfig'

const IconStar = typeof Star !== 'undefined' ? Star : LayoutDashboard

interface SidebarNavItemProps {
  item: SidebarItem
  collapsed: boolean
  isFavorite?: boolean
  onToggleFavorite?: () => void
}

export function SidebarNavItem({
  item,
  collapsed,
  isFavorite,
  onToggleFavorite,
}: SidebarNavItemProps) {
  const { t } = useTranslation()

  const favoriteButton =
    onToggleFavorite && !collapsed ? (
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          onToggleFavorite()
        }}
        aria-pressed={!!isFavorite}
        aria-label={isFavorite ? t('nav.removeFavorite') : t('nav.addFavorite')}
        className="ml-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <IconStar className={cn('h-4 w-4', isFavorite && 'fill-current text-amber-400')} aria-hidden="true" />
      </button>
    ) : null

  const content = (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      aria-label={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          'flex w-full flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
          'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-muted-foreground',
          collapsed && 'justify-center px-2',
        )
      }
    >
      <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
      {!collapsed && item.badge !== undefined && item.badge > 0 && (
        <span className="ml-auto rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
          {item.badge}
        </span>
      )}
    </NavLink>
  )

  if (!collapsed) {
    return (
      <div className="group flex items-center gap-2">
        {content}
        {favoriteButton && (
          <div className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            {favoriteButton}
          </div>
        )}
      </div>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="relative">
          {content}
          {item.badge !== undefined && item.badge > 0 && (
            <span className="absolute -right-1 -top-1 rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-black">
              {item.badge}
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="right">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span>{item.label}</span>
            {item.shortcut && (
              <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {item.shortcut}
              </kbd>
            )}
          </div>
          {onToggleFavorite && (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                onToggleFavorite()
              }}
              aria-pressed={!!isFavorite}
              aria-label={isFavorite ? t('nav.removeFavorite') : t('nav.addFavorite')}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted"
            >
              <IconStar
                className={cn('h-4 w-4', isFavorite && 'fill-current text-amber-400')}
                aria-hidden="true"
              />
            </button>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
