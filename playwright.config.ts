import { defineConfig, devices } from "@playwright/test";

// End-to-end pilot journey (web#22) against a running deployment with seeded
// users: TRYBE_E2E_WEB_URL plus the Clerk keys of that deployment's instance.
// See e2e/README.md.
export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: "e2e-report", open: "never" }],
  ],
  use: {
    baseURL: process.env.TRYBE_E2E_WEB_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /global\.setup\.ts/ },
    {
      // The pilot is used on phones: 360px wide, touch, mobile user agent.
      name: "phone",
      dependencies: ["setup"],
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 360, height: 780 },
      },
    },
  ],
});
