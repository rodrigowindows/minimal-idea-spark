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
import { DeepWorkOverlay } from "@/components/deep-work/DeepWorkOverlay";
import { AppProvider } from "@/contexts/AppContext";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppProvider>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/consultant" element={<Consultant />} />
              <Route path="/opportunities" element={<Opportunities />} />
              <Route path="/journal" element={<Journal />} />
              <Route path="/analytics" element={<Analytics />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
          <DeepWorkOverlay />
        </AppProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
