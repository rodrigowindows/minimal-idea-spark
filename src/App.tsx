import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Dashboard } from "@/pages/Dashboard";
import { Consultant } from "@/pages/Consultant";
import { Opportunities } from "@/pages/Opportunities";
import { Journal } from "@/pages/Journal";
import { Analytics } from "@/pages/Analytics";
import { Habits } from "@/pages/Habits";
import { Goals } from "@/pages/Goals";
import { CalendarPage } from "@/pages/CalendarPage";
import { PriorityDashboard } from "@/components/PriorityDashboard";
import { WeeklyReview } from "@/pages/WeeklyReview";
import { ContentGeneratorPage } from "@/pages/ContentGeneratorPage";
import { AutomationPage } from "@/pages/AutomationPage";
import { TemplatesPage } from "@/pages/TemplatesPage";
import { ImageGenerationPage } from "@/pages/ImageGenerationPage";
import { VersionHistoryPage } from "@/pages/VersionHistoryPage";
import { Settings } from "@/pages/Settings";
import { Workspace } from "@/pages/Workspace";
import { AcceptInvite } from "@/pages/AcceptInvite";
import { SharedView } from "@/pages/SharedView";
import { Auth } from "@/pages/Auth";
import { DeepWorkOverlay } from "@/components/deep-work/DeepWorkOverlay";
import { ConfettiEffect } from "@/components/gamification/ConfettiEffect";
import { XPNotificationListener } from "@/components/gamification/XPNotificationListener";
import { ChatWidget } from "@/components/AIAssistant/ChatWidget";
import { AppProvider, useAppContext } from "@/contexts/AppContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { RealtimeProvider } from "@/contexts/RealtimeContext";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

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
  return (
    <>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/consultant" element={<Consultant />} />
          <Route path="/opportunities" element={<Opportunities />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/habits" element={<Habits />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/priorities" element={<PriorityDashboard />} />
          <Route path="/weekly-review" element={<WeeklyReview />} />
          <Route path="/content-generator" element={<ContentGeneratorPage />} />
          <Route path="/automation" element={<AutomationPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/images" element={<ImageGenerationPage />} />
          <Route path="/version-history" element={<VersionHistoryPage />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/workspace" element={<Workspace />} />
        </Route>
        <Route path="/invite/:token" element={<AcceptInvite />} />
        <Route path="/shared/:token" element={<SharedView />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <DeepWorkOverlay />
      <ConfettiEffect trigger={levelUpTriggered} />
      <XPNotificationListener />
      <ChatWidget />
    </>
  );
}

function AuthGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/invite/:token" element={<AcceptInvite />} />
        <Route path="/shared/:token" element={<SharedView />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    );
  }

  return (
    <LanguageProvider>
      <AppProvider>
        <WorkspaceProvider>
          <RealtimeProvider>
            <AppContent />
          </RealtimeProvider>
        </WorkspaceProvider>
      </AppProvider>
    </LanguageProvider>
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
