import { chromium } from "@playwright/test";

const BASE = "http://localhost:3000";
const USER = "e2e-test@studyplan.local";
const PASS = "e2e-pass-123";
const AUTH_FILE = "playwright-auth-state.json";

export default async () => {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    baseURL: BASE,
  });
  const page = await context.newPage();

  await page.goto(`${BASE}/login`);
  // Use text-based selector: fill the input after "Email" label
  await page.getByText(/Email/i).locator("input").first().fill(USER);
  await page.getByText(/Password/i).locator("input").first().fill(PASS);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/dashboard/, { timeout: 20_000 });

  await context.storageState({ path: AUTH_FILE });
  await browser.close();

  console.log("Auth state saved to", AUTH_FILE);
};
