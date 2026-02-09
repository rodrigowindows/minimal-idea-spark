import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Journal } from "./Journal";
import { TestProviders } from "@/test/mocks/contexts";

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "journal.title": "Journal",
        "journal.newEntry": "New Entry",
        "journal.todaysReflection": "Today's Reflection",
        "journal.placeholder": "Write your thoughts...",
        "journal.mood": "How are you feeling?",
        "journal.energyLevel": "Energy Level",
        "journal.saveEntry": "Save Entry",
        "journal.entrySaved": "Entry saved!",
        "journal.entryDeleted": "Entry deleted",
        "journal.writeFirst": "Please write something first",
        "journal.noEntries": "No journal entries yet",
        "common.cancel": "Cancel",
      };
      return translations[key] ?? key;
    },
    i18n: { language: "en" },
  }),
}));

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
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

// Mock date-fns
vi.mock("date-fns", () => ({
  format: (_date: Date, pattern: string) => "Monday, June 6, 2025",
  parseISO: (str: string) => new Date(str),
}));

vi.mock("@/lib/date-locale", () => ({
  getDateLocale: () => undefined,
}));

// Mock smart-capture components
vi.mock("@/components/smart-capture/VoiceInput", () => ({
  VoiceInput: () => null,
}));

vi.mock("@/components/AudioToText", () => ({
  AudioToText: () => null,
}));

// Mock PWA sync
vi.mock("@/lib/pwa/sync-queue", () => ({
  enqueue: vi.fn(),
}));

// Mock versioning
vi.mock("@/lib/versioning/manager", () => ({
  createSnapshot: vi.fn(),
}));

// Mock useLocalData
const mockAddDailyLog = vi.fn().mockReturnValue({
  id: "log-new",
  user_id: "mock-user-001",
  content: "Test entry",
  mood: "good",
  energy_level: 7,
  log_date: "2025-06-07",
  created_at: new Date().toISOString(),
});
const mockDeleteDailyLog = vi.fn();

vi.mock("@/hooks/useLocalData", () => ({
  useLocalData: () => ({
    dailyLogs: [
      {
        id: "log-001",
        user_id: "mock-user-001",
        content: "Productive day. Finished portfolio.",
        mood: "great",
        energy_level: 9,
        log_date: "2025-06-06",
        created_at: "2025-06-06T22:00:00Z",
      },
      {
        id: "log-002",
        user_id: "mock-user-001",
        content: "Struggled with focus.",
        mood: "okay",
        energy_level: 5,
        log_date: "2025-06-05",
        created_at: "2025-06-05T21:30:00Z",
      },
    ],
    isLoading: false,
    addDailyLog: mockAddDailyLog,
    deleteDailyLog: mockDeleteDailyLog,
  }),
}));

// Mock useXPSystem
vi.mock("@/hooks/useXPSystem", () => ({
  useXPSystem: () => ({
    addXP: vi.fn(),
  }),
}));

describe("Journal page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderJournal() {
    return render(
      <TestProviders initialRoute="/journal">
        <Journal />
      </TestProviders>
    );
  }

  it("renders the page title", () => {
    renderJournal();
    expect(screen.getByText("Journal")).toBeInTheDocument();
  });

  it("shows existing journal entries", () => {
    renderJournal();
    expect(
      screen.getByText("Productive day. Finished portfolio.")
    ).toBeInTheDocument();
    expect(screen.getByText("Struggled with focus.")).toBeInTheDocument();
  });

  it("renders New Entry button", () => {
    renderJournal();
    expect(screen.getByText("New Entry")).toBeInTheDocument();
  });

  it("shows new entry form when clicking New Entry", async () => {
    renderJournal();
    await userEvent.click(screen.getByText("New Entry"));

    expect(screen.getByText("Today's Reflection")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Write your thoughts...")
    ).toBeInTheDocument();
    expect(screen.getByText("Save Entry")).toBeInTheDocument();
  });

  it("shows mood selection", async () => {
    renderJournal();
    await userEvent.click(screen.getByText("New Entry"));
    expect(screen.getByText("How are you feeling?")).toBeInTheDocument();
  });

  it("shows energy level slider", async () => {
    renderJournal();
    await userEvent.click(screen.getByText("New Entry"));
    expect(screen.getByText(/Energy Level/)).toBeInTheDocument();
  });

  it("shows error when submitting empty entry", async () => {
    const { toast } = await import("sonner");
    renderJournal();
    await userEvent.click(screen.getByText("New Entry"));
    await userEvent.click(screen.getByText("Save Entry"));

    expect(toast.error).toHaveBeenCalledWith("Please write something first");
  });

  it("calls addDailyLog when submitting with content", async () => {
    renderJournal();
    await userEvent.click(screen.getByText("New Entry"));

    const textarea = screen.getByPlaceholderText("Write your thoughts...");
    await userEvent.type(textarea, "Great day of learning!");
    await userEvent.click(screen.getByText("Save Entry"));

    await waitFor(() => {
      expect(mockAddDailyLog).toHaveBeenCalledWith(
        expect.objectContaining({
          content: "Great day of learning!",
        })
      );
    });
  });

  it("hides form when clicking Cancel", async () => {
    renderJournal();
    await userEvent.click(screen.getByText("New Entry"));
    expect(screen.getByText("Today's Reflection")).toBeInTheDocument();

    await userEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByText("Today's Reflection")).not.toBeInTheDocument();
  });
});
