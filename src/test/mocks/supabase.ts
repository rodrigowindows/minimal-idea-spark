import { vi } from "vitest";

/**
 * Consistent Supabase mock for all tests.
 * Usage: vi.mock('@/integrations/supabase/client', () => supabaseMock)
 */

const mockSelect = vi.fn().mockReturnValue({
  data: [],
  error: null,
  eq: vi.fn().mockReturnValue({ data: [], error: null }),
  single: vi.fn().mockReturnValue({ data: null, error: null }),
  order: vi.fn().mockReturnValue({ data: [], error: null }),
});

const mockInsert = vi.fn().mockReturnValue({
  select: vi.fn().mockReturnValue({
    single: vi.fn().mockResolvedValue({ data: { id: "mock-id" }, error: null }),
  }),
});

const mockUpdate = vi.fn().mockReturnValue({
  eq: vi.fn().mockResolvedValue({ data: null, error: null }),
});

const mockDelete = vi.fn().mockReturnValue({
  eq: vi.fn().mockResolvedValue({ data: null, error: null }),
});

export const mockSupabaseClient = {
  auth: {
    getSession: vi.fn().mockResolvedValue({
      data: {
        session: {
          access_token: "mock-token",
          user: { id: "mock-user-001", email: "test@test.com" },
        },
      },
      error: null,
    }),
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: "mock-user-001", email: "test@test.com" } },
      error: null,
    }),
    signInWithPassword: vi.fn().mockResolvedValue({
      data: {
        session: { access_token: "mock-token" },
        user: { id: "mock-user-001", email: "test@test.com" },
      },
      error: null,
    }),
    signUp: vi.fn().mockResolvedValue({
      data: { user: { id: "mock-user-001", email: "test@test.com" } },
      error: null,
    }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
  },
  from: vi.fn().mockReturnValue({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  }),
  functions: {
    invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
  channel: vi.fn().mockReturnValue({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
  }),
  removeChannel: vi.fn(),
};

export const supabaseMock = {
  supabase: mockSupabaseClient,
};

export function resetSupabaseMocks() {
  vi.clearAllMocks();
}
