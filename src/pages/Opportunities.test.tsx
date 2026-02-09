import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Opportunities } from "./Opportunities";
import { TestProviders } from "@/test/mocks/contexts";

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useMotionValue: () => ({ get: () => 0 }),
  useTransform: () => "transparent",
}));

// Mock AppContext
vi.mock("@/contexts/AppContext", () => ({
  useAppContext: () => ({
    setCurrentOpportunity: vi.fn(),
    toggleDeepWorkMode: vi.fn(),
  }),
}));

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  },
}));

// Mock AuthContext
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "mock-user-001", email: "test@test.com" },
    session: null,
    loading: false,
    signOut: vi.fn(),
  }),
  AuthProvider: ({ children }: any) => <>{children}</>,
}));

// Mock useLocalData with controllable data
const mockAddOpportunity = vi.fn();
const mockUpdateOpportunity = vi.fn();
const mockDeleteOpportunity = vi.fn();
const mockMoveOpportunityStatus = vi.fn();

vi.mock("@/hooks/useLocalData", () => ({
  useLocalData: () => ({
    opportunities: [
      {
        id: "opp-1",
        user_id: "mock-user-001",
        domain_id: "domain-career",
        title: "Build portfolio",
        description: "Create personal site",
        type: "action",
        status: "doing",
        priority: 9,
        strategic_value: 8,
        created_at: "2025-06-01T10:00:00Z",
      },
      {
        id: "opp-2",
        user_id: "mock-user-001",
        domain_id: "domain-learning",
        title: "Study TypeScript",
        description: "Advanced patterns",
        type: "study",
        status: "backlog",
        priority: 7,
        strategic_value: 6,
        created_at: "2025-06-02T09:00:00Z",
      },
    ],
    domains: [
      {
        id: "domain-career",
        user_id: "mock-user-001",
        name: "Career",
        color_theme: "#4f46e5",
        target_percentage: 30,
        created_at: "2025-01-01",
      },
      {
        id: "domain-learning",
        user_id: "mock-user-001",
        name: "Learning",
        color_theme: "#8b5cf6",
        target_percentage: 25,
        created_at: "2025-01-01",
      },
    ],
    goals: [],
    isLoading: false,
    addOpportunity: mockAddOpportunity,
    updateOpportunity: mockUpdateOpportunity,
    deleteOpportunity: mockDeleteOpportunity,
    moveOpportunityStatus: mockMoveOpportunityStatus,
  }),
}));

// Mock tag service
vi.mock("@/lib/tags/tag-service", () => ({
  getTagsForOpportunity: () => [],
  setTagsForOpportunity: vi.fn(),
  getAllTags: () => [],
  getTagCounts: () => ({}),
}));

// Mock useXPSystem
vi.mock("@/hooks/useXPSystem", () => ({
  useXPSystem: () => ({
    addXP: vi.fn(),
    awardTaskComplete: vi.fn(),
    level: 1,
    xpTotal: 0,
    xpProgress: 0,
  }),
}));

describe("Opportunities page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderOpportunities() {
    return render(
      <TestProviders initialRoute="/opportunities">
        <Opportunities />
      </TestProviders>
    );
  }

  it("renders the page title", () => {
    renderOpportunities();
    expect(screen.getByText("Opportunities")).toBeInTheDocument();
  });

  it("shows opportunity list items", () => {
    renderOpportunities();
    expect(screen.getByText("Build portfolio")).toBeInTheDocument();
    expect(screen.getByText("Study TypeScript")).toBeInTheDocument();
  });

  it("renders New button", () => {
    renderOpportunities();
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("renders search input", () => {
    renderOpportunities();
    expect(
      screen.getByPlaceholderText("Search opportunities...")
    ).toBeInTheDocument();
  });

  it("filters opportunities by search query", async () => {
    renderOpportunities();
    const search = screen.getByPlaceholderText("Search opportunities...");
    await userEvent.type(search, "TypeScript");

    await waitFor(() => {
      expect(screen.getByText("Study TypeScript")).toBeInTheDocument();
      expect(screen.queryByText("Build portfolio")).not.toBeInTheDocument();
    });
  });

  it("renders status filter pills", () => {
    renderOpportunities();
    expect(screen.getByText(/All \(/)).toBeInTheDocument();
  });

  it("renders view mode toggle buttons", () => {
    renderOpportunities();
    expect(screen.getByTitle("List view")).toBeInTheDocument();
    expect(screen.getByTitle("Kanban board")).toBeInTheDocument();
    expect(screen.getByTitle("Eisenhower matrix")).toBeInTheDocument();
  });

  it("shows opportunity type badges", () => {
    renderOpportunities();
    expect(screen.getByText("action")).toBeInTheDocument();
    expect(screen.getByText("study")).toBeInTheDocument();
  });
});
