import { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { usePWA } from '@/hooks/usePWA';
import { useAppContext } from '@/contexts/AppContext';
import {
  LayoutDashboard,
  Send,
  ListChecks,
  Terminal,
  MoreHorizontal,
  WifiOff,
  RefreshCw,
  Plus,
  X,
  BookOpen,
  MessageSquare,
  Lightbulb,
  Target,
  Calendar,
  CheckSquare,
  BarChart3,
  Star,
  TrendingUp,
  Wand2,
  Zap,
  FileText,
  Image,
  History,
  Bell,
  HelpCircle,
  Upload,
  FileBarChart,
  Puzzle,
  Users,
  Moon,
  Settings2,
} from 'lucide-react';

// Bottom nav: 4 main items + "More"
const primaryNavItems = [
  { to: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { to: '/nw/submit', icon: Send, labelKey: 'nav.submit' },
  { to: '/nw/prompts', icon: ListChecks, labelKey: 'nav.prompts' },
  { to: '/nw/logs', icon: Terminal, labelKey: 'nav.logs' },
];

// "More" drawer items — all other pages from the sidebar
const moreNavItems = [
  { to: '/consultant', icon: MessageSquare, labelKey: 'nav.consultant' },
  { to: '/opportunities', icon: Lightbulb, labelKey: 'nav.opportunities' },
  { to: '/journal', icon: BookOpen, labelKey: 'nav.journal' },
  { to: '/goals', icon: Target, labelKey: 'nav.goals' },
  { to: '/habits', icon: CheckSquare, labelKey: 'nav.habits' },
  { to: '/calendar', icon: Calendar, labelKey: 'nav.calendar' },
  { to: '/analytics', icon: BarChart3, labelKey: 'nav.analytics' },
  { to: '/priorities', icon: Star, labelKey: 'nav.priorities' },
  { to: '/weekly-review', icon: TrendingUp, labelKey: 'nav.weeklyReview' },
  { to: '/content-generator', icon: Wand2, labelKey: 'nav.contentGenerator' },
  { to: '/automation', icon: Zap, labelKey: 'nav.automation' },
  { to: '/templates', icon: FileText, labelKey: 'nav.templates' },
  { to: '/images', icon: Image, labelKey: 'nav.images' },
  { to: '/nw', icon: Moon, labelKey: 'nav.nightWorker' },
  { to: '/version-history', icon: History, labelKey: 'nav.versionHistory' },
  { to: '/notifications', icon: Bell, labelKey: 'nav.notifications' },
  { to: '/settings', icon: Settings2, labelKey: 'nav.settings' },
  { to: '/help', icon: HelpCircle, labelKey: 'nav.help' },
  { to: '/import', icon: Upload, labelKey: 'nav.import' },
  { to: '/reports', icon: FileBarChart, labelKey: 'nav.reports' },
  { to: '/integrations', icon: Puzzle, labelKey: 'nav.integrations' },
  { to: '/workspace', icon: Users, labelKey: 'nav.workspace' },
];

// Swipeable pages (includes primary nav + journal in the sequence)
const SWIPE_PAGES = ['/', '/nw/submit', '/nw/prompts', '/nw/logs', '/journal', '/analytics'];

export function MobileNav() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { setCommandPaletteOpen } = useAppContext();
  const {
    isOffline,
    pendingActions,
    updateAvailable,
    applyUpdate,
  } = usePWA();

  const [moreOpen, setMoreOpen] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  // Close "More" drawer on navigation
  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  // Swipe gesture navigation (left/right between swipeable pages)
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

      const currentIdx = SWIPE_PAGES.indexOf(location.pathname);
      if (currentIdx === -1) return;

      if (dx < 0 && currentIdx < SWIPE_PAGES.length - 1) {
        navigate(SWIPE_PAGES[currentIdx + 1]);
      } else if (dx > 0 && currentIdx > 0) {
        navigate(SWIPE_PAGES[currentIdx - 1]);
      }
    };

    main.addEventListener('touchstart', handleTouchStart, { passive: true });
    main.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      main.removeEventListener('touchstart', handleTouchStart);
      main.removeEventListener('touchend', handleTouchEnd);
    };
  }, [location.pathname, navigate]);

  // Close drawer on Escape
  useEffect(() => {
    if (!moreOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [moreOpen]);

  const handleFAB = useCallback(() => {
    setCommandPaletteOpen(true);
  }, [setCommandPaletteOpen]);

  // Check if "More" should show as active (current route is in moreNavItems)
  const isMoreActive = moreNavItems.some((item) =>
    item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
  );

  // Offset for banners so they don't cover the FAB
  const hasBanner = isOffline || updateAvailable;

  return (
    <>
      {/* Offline indicator bar — positioned to not overlap FAB */}
      {isOffline && (
        <div
          className={cn(
            'fixed inset-x-0 z-[51] flex items-center justify-center gap-2 bg-amber-600 px-3 py-1.5 text-xs font-medium text-white',
            'top-14'
          )}
          role="status"
          aria-live="polite"
        >
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
        <div
          className={cn(
            'fixed inset-x-0 z-[51] flex items-center justify-center gap-2 bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground',
            isOffline ? 'top-[calc(3.5rem+2rem)]' : 'top-14'
          )}
          role="alert"
          aria-live="assertive"
        >
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

      {/* FAB — Command palette trigger (positioned above bottom nav, respects safe-area) */}
      <button
        onClick={handleFAB}
        className={cn(
          'fixed z-[52] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all active:scale-90',
          'right-4',
          hasBanner ? 'bottom-[calc(4rem+env(safe-area-inset-bottom)+0.75rem)]' : 'bottom-[calc(4rem+env(safe-area-inset-bottom)+0.75rem)]'
        )}
        aria-label={t('nav.capture')}
      >
        <Plus className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* "More" drawer (bottom sheet style) */}
      {moreOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
            aria-hidden="true"
          />
          {/* Sheet */}
          <div
            className="fixed inset-x-0 bottom-0 z-[61] max-h-[70vh] overflow-y-auto rounded-t-2xl bg-sidebar border-t border-border/50 pb-[env(safe-area-inset-bottom)]"
            role="dialog"
            aria-modal="true"
            aria-label={t('nav.morePages')}
          >
            {/* Handle bar */}
            <div className="sticky top-0 z-10 flex items-center justify-between bg-sidebar px-4 pt-3 pb-2 border-b border-border/30">
              <h2 className="text-sm font-semibold text-foreground">{t('nav.morePages')}</h2>
              <button
                onClick={() => setMoreOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted transition-colors touch-target-auto"
                aria-label={t('nav.closeMobileMenu')}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            {/* Drag indicator */}
            <div className="absolute top-1.5 left-1/2 -translate-x-1/2 h-1 w-8 rounded-full bg-muted-foreground/30" aria-hidden="true" />

            <nav className="p-3" aria-label={t('nav.morePages')}>
              <ul className="grid grid-cols-4 gap-2" role="list">
                {moreNavItems.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === '/'}
                      className={({ isActive }) =>
                        cn(
                          'flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-[11px] font-medium transition-all touch-manipulation min-h-[44px]',
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                        )
                      }
                    >
                      <item.icon className="h-5 w-5" aria-hidden="true" />
                      <span className="text-center leading-tight">{t(item.labelKey)}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </>
      )}

      {/* Bottom navigation */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border/50 bg-sidebar/95 backdrop-blur-md"
        aria-label={t('nav.bottomNavigation')}
      >
        <ul
          className="flex h-16 items-center justify-around pb-[env(safe-area-inset-bottom)]"
          role="list"
        >
          {primaryNavItems.map((item) => (
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
          ))}

          {/* "More" button */}
          <li>
            <button
              onClick={() => setMoreOpen((prev) => !prev)}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-1.5 text-xs font-medium transition-all touch-manipulation min-h-[44px] min-w-[44px] active:scale-95',
                moreOpen || isMoreActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-sidebar-foreground'
              )}
              aria-expanded={moreOpen}
              aria-haspopup="dialog"
              aria-label={t('nav.more')}
            >
              <div className="relative">
                <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
                {(moreOpen || isMoreActive) && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary" aria-hidden="true" />
                )}
              </div>
              <span>{t('nav.more')}</span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
