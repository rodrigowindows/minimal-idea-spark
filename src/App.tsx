import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Dashboard } from "@/pages/Dashboard";
import { Consultant } from "@/pages/Consultant";
import { Opportunities } from "@/pages/Opportunities";
import { Journal } from "@/pages/Journal";
import { Analytics } from "@/pages/Analytics";
import { Habits } from "@/pages/Habits";
import { Goals } from "@/pages/Goals";
import { WeeklyReview } from "@/pages/WeeklyReview";
import { Settings } from "@/pages/Settings";
import { Workspace } from "@/pages/Workspace";
import { AcceptInvite } from "@/pages/AcceptInvite";
import { SharedView } from "@/pages/SharedView";
import { DeepWorkOverlay } from "@/components/deep-work/DeepWorkOverlay";
import { ConfettiEffect } from "@/components/gamification/ConfettiEffect";
import { XPNotificationListener } from "@/components/gamification/XPNotificationListener";
import { AppProvider, useAppContext } from "@/contexts/AppContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import NotFound from "./pages/NotFound";

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
          <Route path="/weekly-review" element={<WeeklyReview />} />
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
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppProvider>
          <WorkspaceProvider>
            <AppContent />
          </WorkspaceProvider>
        </AppProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
