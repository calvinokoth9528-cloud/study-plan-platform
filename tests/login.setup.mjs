import { test as setup, expect } from "@playwright/test";

const AUTH_STATE = "playwright-auth-state.json";
const BASE = "http://localhost:3000";
const USER = "e2e-test@studyplan.local";
const PASS = "e2e-pass-123";

setup("authenticate as e2e user", async ({ page }) => {
  await page.goto(`${BASE}/login`);
  await page.getByLabel(/email/i).fill(USER);
  await page.getByLabel(/password/i).fill(PASS);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/dashboard/, { timeout: 20_000 });

  // Persist the session cookies + local storage for later tests.
  await page.context().storageState({ path: AUTH_STATE });
});
