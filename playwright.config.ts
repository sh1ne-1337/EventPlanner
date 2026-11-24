import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3000);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    timezoneId: "Europe/Kyiv",
    locale: "en-GB",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1400, height: 900 } },
    },
  ],
  webServer: {
    command: process.env.CI ? "npm run start" : "npm run build && npm run start",
    url: `${baseURL}/login`,
    reuseExistingServer: false,
    timeout: 240_000,
    env: { AUTH_TRUST_HOST: "true", PORT: String(PORT), RATE_LIMIT_DISABLED: "true" },
  },
});
