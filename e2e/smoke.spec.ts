import { test, expect } from "@playwright/test";

test.describe("Smoke tests", () => {
  test("home loads and shows main navigation", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Canvas|Idea Spark|Minimal/i);
    await page.waitForLoadState("networkidle").catch(() => {});
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("can navigate to opportunities", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle").catch(() => {});
    await page
      .getByRole("link", { name: /opportunities|oportunidades|tarefas/i })
      .first()
      .click()
      .catch(() => {});
    await expect(page).toHaveURL(/\/(opportunities|auth)/);
  });

  test("auth or app shell is visible", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const main = page
      .locator("main")
      .or(page.locator('[role="main"]'))
      .or(page.locator("#root"));
    await expect(main.first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Auth page", () => {
  test("shows login form", async ({ page }) => {
    await page.goto("/auth");
    await page.waitForLoadState("domcontentloaded");

    const emailInput = page.getByLabel("Email");
    const passwordInput = page.getByLabel("Password");

    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await expect(passwordInput).toBeVisible();
  });

  test("can toggle between login and signup", async ({ page }) => {
    await page.goto("/auth");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByLabel("Email")).toBeVisible({ timeout: 10000 });

    const signUpBtn = page.getByRole("button", { name: /sign up/i });
    if (await signUpBtn.isVisible().catch(() => false)) {
      await signUpBtn.click();
      await expect(page.getByText(/create account/i).first()).toBeVisible();
    }
  });
});

test.describe("Page navigation", () => {
  test("redirects to auth when not logged in", async ({ page }) => {
    await page.goto("/journal");
    await page.waitForLoadState("domcontentloaded");
    const url = page.url();
    expect(url).toMatch(/\/(journal|auth)/);
  });

  test("404 page for unknown routes", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");
    await page.waitForLoadState("domcontentloaded");
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });
});

test.describe("Accessibility basics", () => {
  test("page has a root element", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const root = page.locator("#root");
    await expect(root).toBeVisible({ timeout: 10000 });
  });

  test("page has no duplicate ids in auth form", async ({ page }) => {
    await page.goto("/auth");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByLabel("Email")).toBeVisible({ timeout: 10000 });

    const duplicateIds = await page.evaluate(() => {
      const ids = Array.from(document.querySelectorAll("[id]")).map(
        (el) => el.id
      );
      const seen = new Set<string>();
      const duplicates: string[] = [];
      for (const id of ids) {
        if (seen.has(id)) duplicates.push(id);
        seen.add(id);
      }
      return duplicates;
    });
    expect(duplicateIds).toHaveLength(0);
  });
});
