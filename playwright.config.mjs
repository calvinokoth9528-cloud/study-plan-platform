import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "line",
  globalSetup: "./playwright.global-setup.mjs",
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    headless: true,
    viewport: { width: 1280, height: 900 },
    baseURL: "http://localhost:3000",
    storageState: "playwright-auth-state.json",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  forbidOnly: !!process.env.CI,
  timeout: 60_000,
});
