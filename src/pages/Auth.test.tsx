import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Auth } from "./Auth";
import { TestProviders } from "@/test/mocks/contexts";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock Supabase
const mockSignIn = vi.fn();
const mockSignUp = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: any[]) => mockSignIn(...args),
      signUp: (...args: any[]) => mockSignUp(...args),
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

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("Auth page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignIn.mockResolvedValue({ data: {}, error: null });
    mockSignUp.mockResolvedValue({ data: {}, error: null });
  });

  function renderAuth() {
    return render(
      <TestProviders initialRoute="/auth">
        <Auth />
      </TestProviders>
    );
  }

  it("renders login form by default", () => {
    renderAuth();
    expect(screen.getByText("Login")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("switches between login and signup", async () => {
    renderAuth();
    const signUpLink = screen.getByRole("button", { name: /sign up/i });
    await userEvent.click(signUpLink);
    expect(screen.getByText("Create Account")).toBeInTheDocument();

    const loginLink = screen.getByRole("button", { name: /login/i });
    await userEvent.click(loginLink);
    expect(screen.getByText("Login")).toBeInTheDocument();
  });

  it("calls signInWithPassword on login submit", async () => {
    renderAuth();

    await userEvent.type(screen.getByLabelText("Email"), "user@test.com");
    await userEvent.type(screen.getByLabelText("Password"), "password123");
    await userEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: "user@test.com",
        password: "password123",
      });
    });
  });

  it("calls signUp on signup submit", async () => {
    renderAuth();

    await userEvent.click(screen.getByRole("button", { name: /sign up/i }));
    await userEvent.type(screen.getByLabelText("Email"), "new@test.com");
    await userEvent.type(screen.getByLabelText("Password"), "newpass123");
    await userEvent.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: "new@test.com",
        password: "newpass123",
      });
    });
  });

  it("shows error toast on login failure", async () => {
    const { toast } = await import("sonner");
    mockSignIn.mockResolvedValueOnce({
      data: {},
      error: { message: "Invalid credentials" },
    });

    renderAuth();
    await userEvent.type(screen.getByLabelText("Email"), "bad@test.com");
    await userEvent.type(screen.getByLabelText("Password"), "wrong");
    await userEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Invalid credentials");
    });
  });

  it("navigates to / on successful login", async () => {
    const { toast } = await import("sonner");

    renderAuth();
    await userEvent.type(screen.getByLabelText("Email"), "user@test.com");
    await userEvent.type(screen.getByLabelText("Password"), "pass123");
    await userEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Login successful!");
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  it("disables button during loading", async () => {
    // Make signIn hang
    mockSignIn.mockReturnValue(new Promise(() => {}));

    renderAuth();
    await userEvent.type(screen.getByLabelText("Email"), "user@test.com");
    await userEvent.type(screen.getByLabelText("Password"), "pass123");

    const loginBtn = screen.getByRole("button", { name: /login/i });
    await userEvent.click(loginBtn);

    await waitFor(() => {
      expect(screen.getByText("Processing...")).toBeInTheDocument();
    });
  });
});
