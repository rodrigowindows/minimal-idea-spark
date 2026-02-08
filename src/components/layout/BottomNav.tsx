import { BarChart3, LayoutDashboard, MessageSquare, Target, Plus } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/contexts/LanguageContext'

const navItems = [
  { to: '/', icon: LayoutDashboard, labelKey: 'nav.home' },
  { to: '/opportunities', icon: Target, labelKey: 'nav.tasks' },
  { to: '__fab__', icon: Plus, labelKey: 'nav.capture' },
  { to: '/consultant', icon: MessageSquare, labelKey: 'nav.advisor' },
  { to: '/analytics', icon: BarChart3, labelKey: 'nav.stats' },
]

export function BottomNav() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border/50 bg-sidebar/95 backdrop-blur-md" aria-label={t('nav.bottomNavigation') || 'Bottom navigation'}>
      <ul className="flex h-16 items-center justify-around" role="list">
        {navItems.map((item) => {
          if (item.to === '__fab__') {
            return (
              <li key="fab">
                <button
                  onClick={() => {
                    navigate('/')
                    // Focus the smart capture input after navigating
                    setTimeout(() => {
                      const input = document.querySelector<HTMLInputElement>('input[placeholder*="Capture"]')
                      input?.focus()
                    }, 300)
                  }}
                  className="flex flex-col items-center gap-0.5 touch-manipulation"
                  aria-label={t(item.labelKey)}
                >
                  <div className="flex h-12 w-12 -mt-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30">
                    <Plus className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <span className="text-[10px] font-medium text-primary">{t(item.labelKey)}</span>
                </button>
              </li>
            )
          }

          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors touch-manipulation min-h-[44px] min-w-[44px]',
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-sidebar-foreground'
                  )
                }
              >
                <item.icon className="h-5 w-5" aria-hidden="true" />
                <span>{t(item.labelKey)}</span>
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
