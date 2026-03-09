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

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock Supabase
const mockSignIn = vi.fn();
const mockSignUp = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: any[]) => mockSignIn(...args),
      signUp: (...args: any[]) => mockSignUp(...args),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
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
    expect(screen.getByRole("heading", { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^senha/i)).toBeInTheDocument();
  });

  it("switches between login and signup", async () => {
    renderAuth();
    const signUpLink = screen.getByRole("button", { name: /sign up/i });
    await userEvent.click(signUpLink);
    expect(screen.getByRole("heading", { name: /get started/i })).toBeInTheDocument();

    const signInLink = screen.getByRole("button", { name: /sign in/i });
    await userEvent.click(signInLink);
    expect(screen.getByRole("heading", { name: /welcome back/i })).toBeInTheDocument();
  });

  it("calls signInWithPassword on login submit", async () => {
    renderAuth();

    await userEvent.type(screen.getByLabelText(/email/i), "user@test.com");
    await userEvent.type(screen.getByLabelText(/^senha/i), "password123");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: "user@test.com",
        password: "password123",
      });
    });
  });

  it("calls signUp on signup submit with matching passwords", async () => {
    renderAuth();

    await userEvent.click(screen.getByRole("button", { name: /sign up/i }));
    await userEvent.type(screen.getByLabelText(/email/i), "new@test.com");
    await userEvent.type(screen.getByLabelText(/^senha/i), "Strong1!");
    await userEvent.type(screen.getByLabelText(/confirmar senha/i), "Strong1!");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: "new@test.com",
        password: "Strong1!",
      });
    });
  });

  it("shows error when passwords don't match on signup", async () => {
    renderAuth();

    await userEvent.click(screen.getByRole("button", { name: /sign up/i }));
    await userEvent.type(screen.getByLabelText(/email/i), "new@test.com");
    await userEvent.type(screen.getByLabelText(/^senha/i), "Strong1!");
    await userEvent.type(screen.getByLabelText(/confirmar senha/i), "Different1!");

    expect(screen.getByText(/senhas não coincidem/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it("shows matching confirmation when passwords match", async () => {
    renderAuth();

    await userEvent.click(screen.getByRole("button", { name: /sign up/i }));
    await userEvent.type(screen.getByLabelText(/^senha/i), "Strong1!");
    await userEvent.type(screen.getByLabelText(/confirmar senha/i), "Strong1!");

    expect(screen.getByText(/senhas coincidem/i)).toBeInTheDocument();
  });

  it("blocks signup when password is weak", async () => {
    renderAuth();

    await userEvent.click(screen.getByRole("button", { name: /sign up/i }));
    await userEvent.type(screen.getByLabelText(/email/i), "new@test.com");
    await userEvent.type(screen.getByLabelText(/^senha/i), "weak");
    await userEvent.type(screen.getByLabelText(/confirmar senha/i), "weak");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it("shows error toast on login failure", async () => {
    const { toast } = await import("sonner");
    mockSignIn.mockResolvedValueOnce({
      data: {},
      error: new Error("Invalid credentials"),
    });

    renderAuth();
    await userEvent.type(screen.getByLabelText(/email/i), "bad@test.com");
    await userEvent.type(screen.getByLabelText(/^senha/i), "wrongpass");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Invalid credentials");
    });
  });

  it("navigates to / on successful login", async () => {
    const { toast } = await import("sonner");

    renderAuth();
    await userEvent.type(screen.getByLabelText(/email/i), "user@test.com");
    await userEvent.type(screen.getByLabelText(/password/i), "pass1234");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  it("disables button during loading", async () => {
    mockSignIn.mockReturnValue(new Promise(() => {}));

    renderAuth();
    await userEvent.type(screen.getByLabelText(/email/i), "user@test.com");
    await userEvent.type(screen.getByLabelText(/password/i), "pass1234");

    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText("Processing...")).toBeInTheDocument();
    });
  });
});
