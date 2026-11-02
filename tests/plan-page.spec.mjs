import { test, expect } from "@playwright/test";

test.describe("Plan page — Documents + StudyTimer", () => {
  test("renders documents section and floating study timer after login", async ({ page, context }) => {
    // Restore the persistent login session established by login.setup.mjs.
    // Playwright's storage state (cookies + localStorage) is already applied
    // through the shared context in playwright config's global setup attachment.
    await page.goto("http://localhost:3000/dashboard");
    await page.waitForURL(/dashboard/, { timeout: 20_000 });

    // Wait until plan links are visible (stability depends on seed data being present).
    await page.waitForSelector('a[href^="/plans/"]', { timeout: 15_000 });

    // Enter a plan and scroll down enough to reveal the documents section.
    await page.locator('a[href^="/plans/"]').first().click();
    await page.waitForURL(/plans\/[\w-]+/, { timeout: 20_000 });

    // Both sections should render on the plan page.
    await expect(page.locator('#documents')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[aria-label="Open study timer"]')).toBeVisible({ timeout: 15_000 });

    // Timer button should be present.
    const timerBtn = page.locator('button[aria-label="Open study timer"]');
    await expect(timerBtn).toBeVisible();
  });
});
