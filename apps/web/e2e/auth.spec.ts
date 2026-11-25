import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Sign-up creates real accounts, so it only runs against the local
 * Supabase stack (CI sets E2E_SUPABASE=local). Never the hosted project.
 */
const localSupabase = process.env.E2E_SUPABASE === "local";

async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(results.violations).toEqual([]);
}

test.describe("signed out", () => {
  test("visiting /app redirects to /login and remembers where you were going", async ({ page }) => {
    await page.goto("/app");
    await expect(page).toHaveURL(/\/login\?next=%2Fapp$/);
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  });

  test("login and sign-up pages are accessible", async ({ page }) => {
    await page.goto("/login");
    await expectNoA11yViolations(page);
    await page.goto("/signup");
    await expectNoA11yViolations(page);
  });

  test("sign-up shows field errors without calling the server for bad input", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByLabel("Password").fill("short");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Enter your name.")).toBeVisible();
    await expect(page.getByText("Enter a valid email address.")).toBeVisible();
    await expect(page.getByText("Use at least 8 characters.")).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveValue("not-an-email");
    await expect(page.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");
  });
});

test.describe("account lifecycle", () => {
  test.skip(!localSupabase, "Needs the local Supabase stack (E2E_SUPABASE=local)");

  test("sign up -> dashboard -> log out -> log in", async ({ page }, testInfo) => {
    const email = `e2e-${testInfo.project.name}-${Date.now()}@example.com`;
    const password = "correct-horse-battery";

    // Sign up
    await page.goto("/signup");
    await page.getByLabel("Your name").fill("Taylor Rose");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();

    // Lands on the empty dashboard
    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByRole("heading", { name: "Welcome, Taylor" })).toBeVisible();
    await expect(page.getByText("Let’s create your first event")).toBeVisible();
    await expectNoA11yViolations(page);

    // Signed-in users skip the auth pages
    await page.goto("/login");
    await expect(page).toHaveURL(/\/app$/);

    // Log out
    await page.getByLabel(/Account menu/).click();
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/login$/);

    // Back button must not show private data
    await page.goBack();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText("Let’s create your first event")).toHaveCount(0);

    // Wrong password shows an inline error
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByRole("alert")).toHaveText("Your email or password is incorrect.");
    await expect(page.getByLabel("Email")).toHaveValue(email);

    // Correct password logs back in
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByRole("heading", { name: "Welcome, Taylor" })).toBeVisible();
  });
});
