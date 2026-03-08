import { QueryClient } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { DeepWorkOverlay } from "@/components/deep-work/DeepWorkOverlay";
import { ConfettiEffect } from "@/components/gamification/ConfettiEffect";
import { XPNotificationListener } from "@/components/gamification/XPNotificationListener";
import { ChatWidget } from "@/components/AIAssistant/ChatWidget";
import { WelcomeModal } from "@/components/Onboarding/WelcomeModal";
import { Tour } from "@/components/Onboarding/Tour";
import { ReminderChecker } from "@/components/ReminderChecker";
import { useNotificationGenerator } from "@/hooks/useNotificationGenerator";
import { useAppContext } from "@/contexts/AppContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Suspense, lazy, useEffect, useState } from "react";
const PriorityDashboard = lazy(() => import("@/components/PriorityDashboard").then((m) => ({ default: m.PriorityDashboard })));
import { ErrorBoundary } from "@/components/ErrorBoundary";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";
import { registerFlushSyncQueue } from "@/lib/pwa/offline-manager";
import { processQueue } from "@/lib/pwa/sync-queue";
import { createSyncProcessor } from "@/lib/pwa/sync-processor";
import { supabase } from "@/integrations/supabase/client";
import { refreshCacheFromServer } from "@/lib/offline/sync-manager";
import { AppProviders, AuthenticatedProviders } from "@/providers/AppProviders";

// Main pages — lazy loaded
const Dashboard = lazy(() => import("@/pages/Dashboard").then((m) => ({ default: m.Dashboard })));
const Consultant = lazy(() => import("@/pages/Consultant").then((m) => ({ default: m.Consultant })));
const Opportunities = lazy(() => import("@/pages/Opportunities").then((m) => ({ default: m.Opportunities })));
const Journal = lazy(() => import("@/pages/Journal").then((m) => ({ default: m.Journal })));
const Analytics = lazy(() => import("@/pages/Analytics").then((m) => ({ default: m.Analytics })));
const Habits = lazy(() => import("@/pages/Habits").then((m) => ({ default: m.Habits })));
const Goals = lazy(() => import("@/pages/Goals").then((m) => ({ default: m.Goals })));
const CalendarPage = lazy(() => import("@/pages/CalendarPage").then((m) => ({ default: m.CalendarPage })));
const WeeklyReview = lazy(() => import("@/pages/WeeklyReview").then((m) => ({ default: m.WeeklyReview })));
const NotificationsPage = lazy(() => import("@/pages/Notifications").then((m) => ({ default: m.NotificationsPage })));
const Help = lazy(() => import("@/pages/Help").then((m) => ({ default: m.Help })));
const Settings = lazy(() => import("@/pages/Settings").then((m) => ({ default: m.Settings })));
const Auth = lazy(() => import("@/pages/Auth").then((m) => ({ default: m.Auth })));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));

function PageFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Loading page">
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
      <span className="sr-only">Loading...</span>
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: false,
      retry: 1,
      networkMode: 'online',
    },
    mutations: {
      networkMode: 'online',
    },
  },
});

function AppContent() {
  const { levelUpTriggered } = useAppContext();
  const [tourForceOpen, setTourForceOpen] = useState(false);
  const location = useLocation();
  useNotificationGenerator();

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.info('[App] Navigation occurred', { pathname: location.pathname });
    }
  }, [location.pathname]);

  useEffect(() => {
    registerFlushSyncQueue(async () => {
      const processor = createSyncProcessor(supabase);
      await processQueue(processor);
    });
    const timer = setTimeout(() => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.active?.postMessage({ type: 'CACHE_CRITICAL_ROUTES' });
        });
      }
      refreshCacheFromServer().catch(() => {});
    }, 5000);

    const prefetchTimer = setTimeout(() => {
      import("@/pages/Settings");
      import("@/pages/Dashboard");
      import("@/pages/Opportunities");
      import("@/pages/Journal");
    }, 1500);

    return () => {
      clearTimeout(timer);
      clearTimeout(prefetchTimer);
    };
  }, []);

  return (
    <>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Suspense fallback={<PageFallback />}><Dashboard /></Suspense>} />
          <Route path="/consultant" element={<Suspense fallback={<PageFallback />}><ErrorBoundary><Consultant /></ErrorBoundary></Suspense>} />
          <Route path="/opportunities/:id" element={<Suspense fallback={<PageFallback />}><Opportunities /></Suspense>} />
          <Route path="/opportunities" element={<Suspense fallback={<PageFallback />}><Opportunities /></Suspense>} />
          <Route path="/journal/:date" element={<Suspense fallback={<PageFallback />}><Journal /></Suspense>} />
          <Route path="/journal" element={<Suspense fallback={<PageFallback />}><Journal /></Suspense>} />
          <Route path="/analytics" element={<Suspense fallback={<PageFallback />}><Analytics /></Suspense>} />
          <Route path="/habits" element={<Suspense fallback={<PageFallback />}><Habits /></Suspense>} />
          <Route path="/goals" element={<Suspense fallback={<PageFallback />}><Goals /></Suspense>} />
          <Route path="/calendar" element={<Suspense fallback={<PageFallback />}><CalendarPage /></Suspense>} />
          <Route path="/priorities" element={<Suspense fallback={<PageFallback />}><PriorityDashboard /></Suspense>} />
          <Route path="/weekly-review" element={<Suspense fallback={<PageFallback />}><WeeklyReview /></Suspense>} />
          <Route path="/notifications" element={<Suspense fallback={<PageFallback />}><NotificationsPage /></Suspense>} />
          <Route path="/settings" element={<Suspense fallback={<PageFallback />}><Settings /></Suspense>} />
          <Route path="/help" element={<Suspense fallback={<PageFallback />}><Help /></Suspense>} />
        </Route>
        <Route path="/auth" element={<Navigate to="/" replace />} />
        <Route path="/reset-password" element={<Suspense fallback={<PageFallback />}><ResetPassword /></Suspense>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <DeepWorkOverlay />
      <ConfettiEffect trigger={levelUpTriggered} />
      <XPNotificationListener />
      <ChatWidget />
      <WelcomeModal onStartTour={() => setTourForceOpen(true)} />
      <Tour forceOpen={tourForceOpen} onClose={() => setTourForceOpen(false)} />
      <ReminderChecker />
    </>
  );
}

function AuthGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status" aria-label="Loading">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <span className="sr-only">Loading application...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/auth" element={<Suspense fallback={<PageFallback />}><Auth /></Suspense>} />
        <Route path="/reset-password" element={<Suspense fallback={<PageFallback />}><ResetPassword /></Suspense>} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    );
  }

  return (
    <AuthenticatedProviders>
      <AppContent />
    </AuthenticatedProviders>
  );
}

function App() {
  return (
    <AppProviders queryClient={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AuthGate />
        </AuthProvider>
      </BrowserRouter>
    </AppProviders>
  );
}

export default App;
