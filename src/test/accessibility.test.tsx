import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

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

// Mock react-router-dom
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({}),
  };
});

// Mock sonner
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("Accessibility (jest-axe)", () => {
  it("Auth page has no critical a11y violations", async () => {
    const { Auth } = await import("@/pages/Auth");
    const { container } = render(<Auth />);
    const results = await axe(container);

    // Filter to only critical/serious violations
    const serious = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );
    expect(serious).toHaveLength(0);
  });

  it("Button component has no a11y violations", async () => {
    const { Button } = await import("@/components/ui/button");
    const { container } = render(
      <div>
        <Button>Click me</Button>
        <Button variant="destructive">Delete</Button>
        <Button variant="outline">Cancel</Button>
        <Button disabled>Disabled</Button>
      </div>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("Input with label has no a11y violations", async () => {
    const { Input } = await import("@/components/ui/input");
    const { Label } = await import("@/components/ui/label");
    const { container } = render(
      <div>
        <Label htmlFor="test-input">Test Label</Label>
        <Input id="test-input" type="text" placeholder="Enter text" />
      </div>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("Card component has no a11y violations", async () => {
    const { Card, CardHeader, CardTitle, CardContent } = await import(
      "@/components/ui/card"
    );
    const { container } = render(
      <Card>
        <CardHeader>
          <CardTitle>Test Card</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Card content here</p>
        </CardContent>
      </Card>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("Badge component has no a11y violations", async () => {
    const { Badge } = await import("@/components/ui/badge");
    const { container } = render(
      <div>
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="destructive">Destructive</Badge>
        <Badge variant="outline">Outline</Badge>
      </div>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("Textarea with label has no a11y violations", async () => {
    const { Textarea } = await import("@/components/ui/textarea");
    const { Label } = await import("@/components/ui/label");
    const { container } = render(
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" placeholder="Write your notes..." />
      </div>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("Skeleton loader has no a11y violations", async () => {
    const { Skeleton } = await import("@/components/ui/skeleton");
    const { container } = render(
      <div role="status" aria-label="Loading">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
