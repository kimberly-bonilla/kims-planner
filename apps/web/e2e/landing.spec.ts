import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { APP_NAME } from "@kims-planner/core";

test("landing page shows the brand and passes accessibility checks", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(APP_NAME);
  await expect(page.getByRole("heading", { level: 1, name: APP_NAME })).toBeVisible();
  await expect(page.getByText("Coming soon")).toBeVisible();

  // No horizontal scroll at any viewport (DES-5).
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);

  // WCAG 2.1 AA, including colour contrast (NFR-8, DES-2).
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(results.violations).toEqual([]);
});

test("health endpoint responds", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBe(true);
  expect(await res.json()).toEqual({ ok: true });
});
