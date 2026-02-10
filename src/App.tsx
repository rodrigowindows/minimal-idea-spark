import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { DeepWorkOverlay } from "@/components/deep-work/DeepWorkOverlay";
import { ConfettiEffect } from "@/components/gamification/ConfettiEffect";
import { XPNotificationListener } from "@/components/gamification/XPNotificationListener";
import { ChatWidget } from "@/components/AIAssistant/ChatWidget";
import { WelcomeModal } from "@/components/Onboarding/WelcomeModal";
import { Tour } from "@/components/Onboarding/Tour";
import { ReminderChecker } from "@/components/ReminderChecker";
import { useNotificationGenerator } from "@/hooks/useNotificationGenerator";
import { AppProvider, useAppContext } from "@/contexts/AppContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { WarRoomLayoutProvider } from "@/contexts/WarRoomLayoutContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { RealtimeProvider } from "@/contexts/RealtimeContext";
import { NightWorkerProvider, useNightWorker } from "@/contexts/NightWorkerContext";
import { ShortcutProvider } from "@/contexts/ShortcutContext";
import { NetworkStatusProvider } from "@/contexts/NetworkStatusContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";
import { Suspense, lazy, useEffect, useState } from "react";
import { registerFlushSyncQueue } from "@/lib/pwa/offline-manager";
import { processQueue } from "@/lib/pwa/sync-queue";
import { createSyncProcessor } from "@/lib/pwa/sync-processor";
import { supabase } from "@/integrations/supabase/client";
import { refreshCacheFromServer } from "@/lib/offline/sync-manager";

const AcceptInvite = lazy(() => import("@/pages/AcceptInvite").then((m) => ({ default: m.AcceptInvite })));
const SharedView = lazy(() => import("@/pages/SharedView").then((m) => ({ default: m.SharedView })));
const Auth = lazy(() => import("@/pages/Auth").then((m) => ({ default: m.Auth })));
const NWDashboard = lazy(() => import("@/pages/NWDashboard"));
const NWSubmit = lazy(() => import("@/pages/NWSubmit"));
const NWPrompts = lazy(() => import("@/pages/NWPrompts"));
const NWPromptDetail = lazy(() => import("@/pages/NWPromptDetail"));
const NWLogs = lazy(() => import("@/pages/NWLogs"));
const NWSettings = lazy(() => import("@/pages/NWSettings"));
const NWConnect = lazy(() => import("@/pages/NWConnect"));

const PageFallback = () => (
  <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Loading page">
    <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
    <span className="sr-only">Loading...</span>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 min stale-while-revalidate
      gcTime: 1000 * 60 * 30, // 30 min garbage collection
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});

function AppContent() {
  const { levelUpTriggered } = useAppContext();
  const [tourForceOpen, setTourForceOpen] = useState(false);
  const navigate = useNavigate();
  const { lastError } = useNightWorker();
  useNotificationGenerator();

  useEffect(() => {
    registerFlushSyncQueue(async () => {
      const processor = createSyncProcessor(supabase);
      await processQueue(processor);
    });
    // Warm cache for critical SPA routes so they work offline
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.active?.postMessage({ type: 'CACHE_CRITICAL_ROUTES' });
      });
    }
    // Populate IndexedDB offline cache on initial load (best-effort)
    refreshCacheFromServer().catch(() => {});
  }, []);

  useEffect(() => {
    if (lastError === 'auth') {
      navigate('/connect');
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
          <Route path="/" element={<Suspense fallback={<PageFallback />}><NWDashboard /></Suspense>} />
          <Route path="/submit" element={<Suspense fallback={<PageFallback />}><NWSubmit /></Suspense>} />
          <Route path="/prompts/:id" element={<Suspense fallback={<PageFallback />}><NWPromptDetail /></Suspense>} />
          <Route path="/prompts" element={<Suspense fallback={<PageFallback />}><NWPrompts /></Suspense>} />
          <Route path="/logs" element={<Suspense fallback={<PageFallback />}><NWLogs /></Suspense>} />
          <Route path="/settings" element={<Suspense fallback={<PageFallback />}><NWSettings /></Suspense>} />
          <Route path="/connect" element={<Suspense fallback={<PageFallback />}><NWConnect /></Suspense>} />
        </Route>
        <Route path="/invite/:token" element={<Suspense fallback={<PageFallback />}><AcceptInvite /></Suspense>} />
        <Route path="/shared/:token" element={<Suspense fallback={<PageFallback />}><SharedView /></Suspense>} />
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
    <ErrorBoundary>
      <ThemeProvider>
        <NetworkStatusProvider>
        <WarRoomLayoutProvider>
        <LanguageProvider>
        <AppProvider>
          <ShortcutProvider>
          <WorkspaceProvider>
            <RealtimeProvider>
              <AppContent />
            </RealtimeProvider>
          </WorkspaceProvider>
          </ShortcutProvider>
        </AppProvider>
      </LanguageProvider>
      </WarRoomLayoutProvider>
        </NetworkStatusProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <NightWorkerProvider>
        <BrowserRouter>
          <AuthProvider>
            <AuthGate />
          </AuthProvider>
        </BrowserRouter>
      </NightWorkerProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
