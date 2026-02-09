import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { usePWA } from '@/hooks/usePWA';
import {
  LayoutDashboard,
  Target,
  Plus,
  MessageSquare,
  BarChart3,
  WifiOff,
  Download,
  RefreshCw,
  X,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, labelKey: 'nav.home' },
  { to: '/opportunities', icon: Target, labelKey: 'nav.tasks' },
  { to: '__fab__', icon: Plus, labelKey: 'nav.capture' },
  { to: '/consultant', icon: MessageSquare, labelKey: 'nav.advisor' },
  { to: '/analytics', icon: BarChart3, labelKey: 'nav.stats' },
];

export function MobileNav() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    isOffline,
    pendingActions,
    canInstall,
    promptInstall,
    updateAvailable,
    applyUpdate,
  } = usePWA();

  const [showBanner, setShowBanner] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  // Show install banner after 30s if installable and not dismissed
  useEffect(() => {
    if (!canInstall || bannerDismissed) return;
    const timer = setTimeout(() => setShowBanner(true), 30000);
    return () => clearTimeout(timer);
  }, [canInstall, bannerDismissed]);

  // Swipe gesture navigation (left/right between main pages)
  const pages = ['/', '/opportunities', '/journal', '/consultant', '/analytics'];

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
          <span>You're offline</span>
          {pendingActions > 0 && (
            <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5">
              {pendingActions} pending
            </span>
          )}
        </div>
      )}

      {/* Update available bar */}
      {updateAvailable && (
        <div className="fixed top-14 inset-x-0 z-50 flex items-center justify-center gap-2 bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground" role="alert" aria-live="assertive">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Update available</span>
          <button
            onClick={applyUpdate}
            className="ml-1 rounded bg-white/20 px-2 py-0.5 text-xs hover:bg-white/30 transition-colors"
            aria-label="Refresh to update"
          >
            Refresh
          </button>
        </div>
      )}

      {/* Install banner (slides up from bottom, above nav) */}
      {showBanner && canInstall && (
        <div className="fixed inset-x-0 bottom-16 z-50 mx-3" role="complementary" aria-label="Install app banner">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-lg">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Download className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Install Canvas</p>
              <p className="text-xs text-muted-foreground truncate">
                Add to home screen for a better experience
              </p>
            </div>
            <button
              onClick={async () => {
                await promptInstall();
                setShowBanner(false);
              }}
              className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
              aria-label="Install Canvas app"
            >
              Install
            </button>
            <button
              onClick={() => {
                setShowBanner(false);
                setBannerDismissed(true);
              }}
              className="shrink-0 p-1 text-muted-foreground hover:text-foreground"
              aria-label="Dismiss install banner"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border/50 bg-sidebar/95 backdrop-blur-md" aria-label="Mobile navigation">
        <ul className="flex h-16 items-center justify-around pb-[env(safe-area-inset-bottom)]" role="list">
          {navItems.map((item) => {
            if (item.to === '__fab__') {
              return (
                <li key="fab">
                  <button
                    onClick={() => {
                      navigate('/');
                      setTimeout(() => {
                        const input = document.querySelector<HTMLInputElement>(
                          'input[placeholder*="Capture"]'
                        );
                        input?.focus();
                      }, 300);
                    }}
                    className="flex flex-col items-center gap-0.5 touch-manipulation active:scale-95 transition-transform"
                    aria-label={t(item.labelKey)}
                  >
                    <div className="flex h-12 w-12 -mt-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30">
                      <Plus className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <span className="text-[10px] font-medium text-primary">{t(item.labelKey)}</span>
                  </button>
                </li>
              );
            }

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
