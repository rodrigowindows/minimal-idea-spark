import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { usePWA } from '@/hooks/usePWA';
import {
  LayoutDashboard,
  Send,
  ListChecks,
  Terminal,
  Settings2,
  WifiOff,
  RefreshCw,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { to: '/submit', icon: Send, labelKey: 'nav.submit' },
  { to: '/prompts', icon: ListChecks, labelKey: 'nav.prompts' },
  { to: '/logs', icon: Terminal, labelKey: 'nav.logs' },
  { to: '/settings', icon: Settings2, labelKey: 'nav.settings' },
];

export function MobileNav() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    isOffline,
    pendingActions,
    updateAvailable,
    applyUpdate,
  } = usePWA();

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  // Swipe gesture navigation (left/right between main pages)
  const pages = ['/', '/submit', '/prompts', '/logs', '/settings'];

  useEffect(() => {
    const main = document.querySelector('main');
    if (!main) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      const dy = e.changedTouches[0].clientY - touchStartY.current;

      if (Math.abs(dx) < 80 || Math.abs(dx) < Math.abs(dy) * 1.5) return;

      const currentIdx = pages.indexOf(location.pathname);
      if (currentIdx === -1) return;

      if (dx < 0 && currentIdx < pages.length - 1) {
        navigate(pages[currentIdx + 1]);
      } else if (dx > 0 && currentIdx > 0) {
        navigate(pages[currentIdx - 1]);
      }
    };

    main.addEventListener('touchstart', handleTouchStart, { passive: true });
    main.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      main.removeEventListener('touchstart', handleTouchStart);
      main.removeEventListener('touchend', handleTouchEnd);
    };
  }, [location.pathname, navigate]);

  return (
    <>
      {/* Offline indicator bar */}
      {isOffline && (
        <div className="fixed top-14 inset-x-0 z-50 flex items-center justify-center gap-2 bg-amber-600 px-3 py-1.5 text-xs font-medium text-white" role="status" aria-live="polite">
          <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{t('layout.offlineShort')}</span>
          {pendingActions > 0 && (
            <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5">
              {pendingActions} {t('layout.pending')}
            </span>
          )}
        </div>
      )}

      {/* Update available bar */}
      {updateAvailable && (
        <div className="fixed top-14 inset-x-0 z-50 flex items-center justify-center gap-2 bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground" role="alert" aria-live="assertive">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{t('layout.updateAvailable')}</span>
          <button
            onClick={applyUpdate}
            className="ml-1 rounded bg-white/20 px-2 py-0.5 text-xs hover:bg-white/30 transition-colors"
            aria-label={t('layout.refreshToUpdate')}
          >
            {t('layout.refresh')}
          </button>
        </div>
      )}

      {/* Bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border/50 bg-sidebar/95 backdrop-blur-md" aria-label="Mobile navigation">
        <ul className="flex h-16 items-center justify-around pb-[env(safe-area-inset-bottom)]" role="list">
          {navItems.map((item) => {
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'flex flex-col items-center gap-1 px-3 py-1.5 text-xs font-medium transition-all touch-manipulation min-h-[44px] min-w-[44px] active:scale-95',
                      isActive
                        ? 'text-primary'
                        : 'text-muted-foreground hover:text-sidebar-foreground'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="relative">
                        <item.icon className="h-5 w-5" aria-hidden="true" />
                        {isActive && (
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary" aria-hidden="true" />
                        )}
                      </div>
                      <span>{t(item.labelKey)}</span>
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
