import React from "react";
import { vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";

// Mock Auth context values
export const mockAuthValue = {
  session: null as any,
  user: { id: "mock-user-001", email: "test@test.com" } as any,
  loading: false,
  signOut: vi.fn(),
};

// Mock App context values
export const mockAppContextValue = {
  setCurrentOpportunity: vi.fn(),
  toggleDeepWorkMode: vi.fn(),
  deepWorkMode: false,
  currentOpportunity: null,
  levelUpTriggered: false,
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: Infinity,
    },
  },
});

/**
 * Wraps a component in all required providers for integration tests.
 */
export function TestProviders({
  children,
  initialRoute = "/",
}: {
  children: React.ReactNode;
  initialRoute?: string;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <MemoryRouter initialEntries={[initialRoute]}>
          {children}
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
