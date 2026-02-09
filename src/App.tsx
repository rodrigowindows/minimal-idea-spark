import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PriorityDashboard } from "@/components/PriorityDashboard";
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
import { ErrorBoundary } from "@/components/ErrorBoundary";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";
import { Suspense, lazy, useEffect } from "react";
import { registerFlushSyncQueue } from "@/lib/pwa/offline-manager";
import { processQueue } from "@/lib/pwa/sync-queue";
import { createSyncProcessor } from "@/lib/pwa/sync-processor";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = lazy(() => import("@/pages/Dashboard").then((m) => ({ default: m.Dashboard })));
const Consultant = lazy(() => import("@/pages/Consultant").then((m) => ({ default: m.Consultant })));
const Opportunities = lazy(() => import("@/pages/Opportunities").then((m) => ({ default: m.Opportunities })));
const Journal = lazy(() => import("@/pages/Journal").then((m) => ({ default: m.Journal })));
const Analytics = lazy(() => import("@/pages/Analytics").then((m) => ({ default: m.Analytics })));
const Habits = lazy(() => import("@/pages/Habits").then((m) => ({ default: m.Habits })));
const Goals = lazy(() => import("@/pages/Goals").then((m) => ({ default: m.Goals })));
const CalendarPage = lazy(() => import("@/pages/CalendarPage").then((m) => ({ default: m.CalendarPage })));
const WeeklyReview = lazy(() => import("@/pages/WeeklyReview").then((m) => ({ default: m.WeeklyReview })));
const ContentGeneratorPage = lazy(() => import("@/pages/ContentGeneratorPage").then((m) => ({ default: m.ContentGeneratorPage })));
const AutomationPage = lazy(() => import("@/pages/AutomationPage").then((m) => ({ default: m.AutomationPage })));
const TemplatesPage = lazy(() => import("@/pages/TemplatesPage").then((m) => ({ default: m.TemplatesPage })));
const ImageGenerationPage = lazy(() => import("@/pages/ImageGenerationPage").then((m) => ({ default: m.ImageGenerationPage })));
const VersionHistoryPage = lazy(() => import("@/pages/VersionHistoryPage").then((m) => ({ default: m.VersionHistoryPage })));
const Settings = lazy(() => import("@/pages/Settings").then((m) => ({ default: m.Settings })));
const NotificationsPage = lazy(() => import("@/pages/Notifications").then((m) => ({ default: m.NotificationsPage })));
const Workspace = lazy(() => import("@/pages/Workspace").then((m) => ({ default: m.Workspace })));
const AcceptInvite = lazy(() => import("@/pages/AcceptInvite").then((m) => ({ default: m.AcceptInvite })));
const SharedView = lazy(() => import("@/pages/SharedView").then((m) => ({ default: m.SharedView })));
const Auth = lazy(() => import("@/pages/Auth").then((m) => ({ default: m.Auth })));
const Help = lazy(() => import("@/pages/Help").then((m) => ({ default: m.Help })));
const ImportPage = lazy(() => import("@/pages/ImportPage").then((m) => ({ default: m.ImportPage })));
const ReportsPage = lazy(() => import("@/pages/ReportsPage").then((m) => ({ default: m.ReportsPage })));

const PageFallback = () => (
  <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Loading page">
    <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
    <span className="sr-only">Loading...</span>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

function AppContent() {
  const { levelUpTriggered } = useAppContext();
  useNotificationGenerator();

  useEffect(() => {
    registerFlushSyncQueue(async () => {
      const processor = createSyncProcessor(supabase);
      await processQueue(processor);
    });
  }, []);

  return (
    <>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Suspense fallback={<PageFallback />}><Dashboard /></Suspense>} />
          <Route path="/consultant" element={<Suspense fallback={<PageFallback />}><Consultant /></Suspense>} />
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
          <Route path="/content-generator" element={<Suspense fallback={<PageFallback />}><ContentGeneratorPage /></Suspense>} />
          <Route path="/automation" element={<Suspense fallback={<PageFallback />}><AutomationPage /></Suspense>} />
          <Route path="/templates" element={<Suspense fallback={<PageFallback />}><TemplatesPage /></Suspense>} />
          <Route path="/images" element={<Suspense fallback={<PageFallback />}><ImageGenerationPage /></Suspense>} />
          <Route path="/version-history" element={<Suspense fallback={<PageFallback />}><VersionHistoryPage /></Suspense>} />
          <Route path="/notifications" element={<Suspense fallback={<PageFallback />}><NotificationsPage /></Suspense>} />
          <Route path="/settings" element={<Suspense fallback={<PageFallback />}><Settings /></Suspense>} />
          <Route path="/help" element={<Suspense fallback={<PageFallback />}><Help /></Suspense>} />
          <Route path="/import" element={<Suspense fallback={<PageFallback />}><ImportPage /></Suspense>} />
          <Route path="/reports" element={<Suspense fallback={<PageFallback />}><ReportsPage /></Suspense>} />
          <Route path="/workspace" element={<Suspense fallback={<PageFallback />}><Workspace /></Suspense>} />
        </Route>
        <Route path="/invite/:token" element={<Suspense fallback={<PageFallback />}><AcceptInvite /></Suspense>} />
        <Route path="/shared/:token" element={<Suspense fallback={<PageFallback />}><SharedView /></Suspense>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <DeepWorkOverlay />
      <ConfettiEffect trigger={levelUpTriggered} />
      <XPNotificationListener />
      <ChatWidget />
      <WelcomeModal />
      <Tour />
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
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <WarRoomLayoutProvider>
        <LanguageProvider>
        <AppProvider>
          <WorkspaceProvider>
            <RealtimeProvider>
              <AppContent />
            </RealtimeProvider>
          </WorkspaceProvider>
        </AppProvider>
      </LanguageProvider>
      </WarRoomLayoutProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AuthGate />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
