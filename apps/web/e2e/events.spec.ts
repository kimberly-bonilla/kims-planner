import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/** Creates real accounts, so only runs against the local Supabase stack (CI). */
test.skip(process.env.E2E_SUPABASE !== "local", "Needs the local Supabase stack (E2E_SUPABASE=local)");

async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(results.violations).toEqual([]);
}

async function signUp(page: Page, name: string, email: string) {
  await page.goto("/signup");
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/app$/);
}

test("create, view and edit an event; the free plan allows only one", async ({ page }, testInfo) => {
  await signUp(page, "Jordan Lee", `e2e-events-${testInfo.project.name}-${Date.now()}@example.com`);

  // Default currency set in account settings is used for the new event.
  await page.goto("/app/settings/account");
  await page.getByLabel("Default currency").selectOption("cad");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByRole("status")).toHaveText("Your settings are saved.");

  // Empty dashboard -> create event
  await page.goto("/app");
  await page.getByRole("link", { name: "Create your event" }).click();
  await expect(page).toHaveURL(/\/app\/events\/new$/);
  await expectNoA11yViolations(page);
  await expect(page.getByLabel("Currency")).toHaveValue("cad");

  // Validation: empty name and date, and "Other" requires a custom type
  await page.getByLabel("Event type").selectOption("other");
  await page.getByRole("button", { name: "Create event" }).click();
  await expect(page.getByText("Give your event a name.")).toBeVisible();
  await expect(page.getByText("Choose the event date.")).toBeVisible();
  await expect(page.getByText("Tell us what kind of event it is.")).toBeVisible();

  await page.getByLabel("Event name").fill("Jordan's 30th");
  await page.getByLabel("What kind of event is it?").fill("Milestone birthday");
  await page.getByLabel("Event date").fill("2028-06-15");
  await page.getByLabel("City (optional)").fill("Montreal");
  await page.getByRole("button", { name: "Create event" }).click();

  // Event home
  await expect(page).toHaveURL(/\/app\/events\/[0-9a-f-]{36}$/);
  const eventUrl = page.url();
  await expect(page.getByRole("heading", { level: 1, name: "Jordan's 30th" })).toBeVisible();
  await expect(page.getByText("Milestone birthday")).toBeVisible();
  await expect(page.getByText("Thursday, June 15, 2028")).toBeVisible();
  await expect(page.getByText("Montreal")).toBeVisible();
  await expectNoA11yViolations(page);

  // /app now goes straight to the event
  await page.goto("/app");
  await expect(page).toHaveURL(eventUrl);

  // Edit every field
  await page.getByRole("link", { name: "Edit event details" }).click();
  await expect(page.getByLabel("Event name")).toHaveValue("Jordan's 30th");
  await page.getByLabel("Event name").fill("Jordan & Alex's Wedding");
  await page.getByLabel("Event type").selectOption("wedding");
  await expect(page.getByLabel("What kind of event is it?")).toHaveCount(0);
  await page.getByLabel("Event date").fill("2029-09-01");
  await page.getByLabel("City (optional)").fill("Quebec City");
  await page.getByLabel("Venue (optional)").fill("Chateau Garden");
  await page.getByLabel("Currency").selectOption("usd");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toHaveText("Your changes are saved.");
  await expectNoA11yViolations(page);

  // Changes survive a reload
  await page.reload();
  await expect(page.getByLabel("Event name")).toHaveValue("Jordan & Alex's Wedding");
  await expect(page.getByLabel("Event type")).toHaveValue("wedding");
  await expect(page.getByLabel("Event date")).toHaveValue("2029-09-01");
  await expect(page.getByLabel("Venue (optional)")).toHaveValue("Chateau Garden");
  await expect(page.getByLabel("Currency")).toHaveValue("usd");

  await page.goto(eventUrl);
  await expect(page.getByText("Wedding", { exact: true })).toBeVisible();
  await expect(page.getByText("Chateau Garden, Quebec City")).toBeVisible();

  // Free plan: a second event is refused with an upgrade message
  await page.goto("/app/events/new");
  await expect(page.getByRole("heading", { name: "You already have an event" })).toBeVisible();
  await expect(page.getByText(/Upgrade to Premium for unlimited events/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Create event" })).toHaveCount(0);
});

test("another user's event and made-up ids show a not-found page", async ({ page, browser }, testInfo) => {
  const stamp = `${testInfo.project.name}-${Date.now()}`;

  // Owner creates an event
  await signUp(page, "Owner One", `e2e-owner-${stamp}@example.com`);
  await page.goto("/app/events/new");
  await page.getByLabel("Event name").fill("Private party");
  await page.getByLabel("Event date").fill("2028-01-01");
  await page.getByRole("button", { name: "Create event" }).click();
  await expect(page).toHaveURL(/\/app\/events\/[0-9a-f-]{36}$/);
  const eventUrl = page.url();

  // A different user, in a separate browser context, cannot open it
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await signUp(otherPage, "Other Person", `e2e-other-${stamp}@example.com`);
  const res = await otherPage.goto(eventUrl);
  expect(res?.status()).toBe(404);
  await expect(otherPage.getByText("Private party")).toHaveCount(0);
  expect((await otherPage.goto(`${eventUrl}/settings`))?.status()).toBe(404);
  expect((await otherPage.goto("/app/events/not-a-real-id"))?.status()).toBe(404);
  await other.close();
});
