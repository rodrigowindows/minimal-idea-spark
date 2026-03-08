import { QueryClient } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams } from "react-router-dom";
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
import { useNightWorker } from "@/contexts/NightWorkerContext";
import { PriorityDashboard } from "@/components/PriorityDashboard";
import { NightWorkerSimpleInterface } from "@/components/night-worker/SimpleInterface";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";
import { Suspense, lazy, useEffect, useState } from "react";
import { registerFlushSyncQueue } from "@/lib/pwa/offline-manager";
import { processQueue } from "@/lib/pwa/sync-queue";
import { createSyncProcessor } from "@/lib/pwa/sync-processor";
import { supabase } from "@/integrations/supabase/client";
import { refreshCacheFromServer } from "@/lib/offline/sync-manager";
import { AppProviders, AuthenticatedProviders } from "@/providers/AppProviders";

// Main pages
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

// Night Worker pages
const NWDashboard = lazy(() => import("@/pages/NWDashboard"));
const NWSubmit = lazy(() => import("@/pages/NWSubmit"));
const NWPrompts = lazy(() => import("@/pages/NWPrompts"));
const NWPromptDetail = lazy(() => import("@/pages/NWPromptDetail"));
const NWLogs = lazy(() => import("@/pages/NWLogs"));
const NWSettings = lazy(() => import("@/pages/NWSettings"));
const NWConnect = lazy(() => import("@/pages/NWConnect"));
const NWTemplates = lazy(() => import("@/pages/NWTemplates"));
const NWRunTemplate = lazy(() => import("@/pages/NWRunTemplate"));
const NWProjects = lazy(() => import("@/pages/NWProjects"));
const NWTestDashboard = lazy(() => import("@/pages/NWTestDashboard"));
const NWProjectDetail = lazy(() => import("@/pages/NWProjectDetail"));

// Auth & shared pages
const AcceptInvite = lazy(() => import("@/pages/AcceptInvite").then((m) => ({ default: m.AcceptInvite })));

const Auth = lazy(() => import("@/pages/Auth").then((m) => ({ default: m.Auth })));

const PageFallback = () => (
  <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Loading page">
    <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
    <span className="sr-only">Loading...</span>
  </div>
);

const LegacyPromptRedirect = () => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={id ? `/nw/prompts/${id}` : "/nw/prompts"} replace />;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes — show cached data instantly on navigation
      gcTime: 1000 * 60 * 10, // 10 min
      refetchOnWindowFocus: false, // individual queries opt-in via their own settings
      refetchOnReconnect: true,
      refetchOnMount: false, // use cache on navigation; individual queries use refetchInterval for freshness
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
  const navigate = useNavigate();
  const location = useLocation();
  const { lastError } = useNightWorker();
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
    // Delay heavy background tasks so they don't compete with page data loading
    const timer = setTimeout(() => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.active?.postMessage({ type: 'CACHE_CRITICAL_ROUTES' });
        });
      }
      refreshCacheFromServer().catch(() => {});
    }, 5000);

    // Prefetch common page chunks so navigation is instant
    const prefetchTimer = setTimeout(() => {
      import("@/pages/NWDashboard");
      import("@/pages/NWPrompts");
      import("@/pages/NWPromptDetail");
      import("@/pages/NWProjects");
      import("@/pages/NWProjectDetail");
      import("@/pages/NWLogs");
      import("@/pages/NWSubmit");
      import("@/pages/NWSettings");
      import("@/pages/NWTemplates");
      import("@/pages/Settings");
      import("@/pages/Dashboard");
    }, 1500);

    return () => {
      clearTimeout(timer);
      clearTimeout(prefetchTimer);
    };
  }, []);

  useEffect(() => {
    if (lastError === 'auth') {
      navigate('/nw/connect');
    }
  }, [lastError, navigate]);

  const handleStartTour = () => {
    setTourForceOpen(true);
  };

  const handleTourClose = () => {
    setTourForceOpen(false);
  };

  return (
    <>
      <Routes>
        <Route element={<AppLayout />}>
          {/* Main pages */}
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
          <Route path="/priorities" element={<PriorityDashboard />} />
          <Route path="/weekly-review" element={<Suspense fallback={<PageFallback />}><WeeklyReview /></Suspense>} />
          <Route path="/notifications" element={<Suspense fallback={<PageFallback />}><NotificationsPage /></Suspense>} />
          <Route path="/settings" element={<Suspense fallback={<PageFallback />}><Settings /></Suspense>} />
          <Route path="/help" element={<Suspense fallback={<PageFallback />}><Help /></Suspense>} />
          <Route path="/import" element={<Suspense fallback={<PageFallback />}><ImportPage /></Suspense>} />
          <Route path="/reports" element={<Suspense fallback={<PageFallback />}><ReportsPage /></Suspense>} />
          <Route path="/integrations" element={<Suspense fallback={<PageFallback />}><Integrations /></Suspense>} />
          <Route path="/workspace" element={<Suspense fallback={<PageFallback />}><Workspace /></Suspense>} />

          {/* Night Worker pages (Standard /nw prefix) */}
          <Route path="/nw" element={<Suspense fallback={<PageFallback />}><NWDashboard /></Suspense>} />
          <Route path="/nw/submit" element={<Suspense fallback={<PageFallback />}><NWSubmit /></Suspense>} />
          <Route path="/nw/prompts/:id" element={<Suspense fallback={<PageFallback />}><NWPromptDetail /></Suspense>} />
          <Route path="/nw/prompts" element={<Suspense fallback={<PageFallback />}><NWPrompts /></Suspense>} />
          <Route path="/nw/projects/:id" element={<Suspense fallback={<PageFallback />}><NWProjectDetail /></Suspense>} />
          <Route path="/nw/projects" element={<Suspense fallback={<PageFallback />}><NWProjects /></Suspense>} />
          <Route path="/nw/templates" element={<Suspense fallback={<PageFallback />}><NWTemplates /></Suspense>} />
          <Route path="/nw/templates/:id/run" element={<Suspense fallback={<PageFallback />}><NWRunTemplate /></Suspense>} />
          <Route path="/nw/logs" element={<Suspense fallback={<PageFallback />}><NWLogs /></Suspense>} />
          <Route path="/nw/settings" element={<Suspense fallback={<PageFallback />}><NWSettings /></Suspense>} />
          <Route path="/nw/connect" element={<Suspense fallback={<PageFallback />}><NWConnect /></Suspense>} />
          <Route path="/nw/simple" element={<div className="p-8"><NightWorkerSimpleInterface /></div>} />
          <Route path="/nw/tests" element={<Suspense fallback={<PageFallback />}><NWTestDashboard /></Suspense>} />

          {/* Legacy redirects for better compatibility */}
          <Route path="/prompts" element={<Navigate to="/nw/prompts" replace />} />
          <Route path="/prompts/:id" element={<LegacyPromptRedirect />} />
          <Route path="/submit" element={<Navigate to="/nw/submit" replace />} />
          <Route path="/logs" element={<Navigate to="/nw/logs" replace />} />
          <Route path="/connect" element={<Navigate to="/nw/connect" replace />} />
        </Route>
        <Route path="/invite/:token" element={<Suspense fallback={<PageFallback />}><AcceptInvite /></Suspense>} />
        <Route path="/shared/:token" element={<Suspense fallback={<PageFallback />}><SharedView /></Suspense>} />
        <Route path="/auth" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <DeepWorkOverlay />
      <ConfettiEffect trigger={levelUpTriggered} />
      <XPNotificationListener />
      <ChatWidget />
      <WelcomeModal onStartTour={handleStartTour} />
      <Tour forceOpen={tourForceOpen} onClose={handleTourClose} />
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
        <Route path="/invite/:token" element={<Suspense fallback={<PageFallback />}><AcceptInvite /></Suspense>} />
        <Route path="/shared/:token" element={<Suspense fallback={<PageFallback />}><SharedView /></Suspense>} />
        <Route path="/connect" element={<Suspense fallback={<PageFallback />}><NWConnect /></Suspense>} />
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

const App = () => (
  <AppProviders queryClient={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </BrowserRouter>
  </AppProviders>
);

export default App;
