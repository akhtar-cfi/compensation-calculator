import { defineConfig, devices } from "@playwright/test";

// Uses the Chromium that is already installed on the machine when one is given (CI installs its own).
const executablePath = process.env.PW_CHROMIUM_PATH;
// Set to run the same tests against a deployed site instead of a local preview (`npm run web:smoke`).
const live = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  fullyParallel: true,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]]
    : "list",
  use: {
    baseURL: live ?? "http://127.0.0.1:4173/",
    ...devices["Desktop Chrome"],
    ...(executablePath && { launchOptions: { executablePath } }),
  },
  ...(!live && {
    webServer: {
      command: "npx vite preview --config web/vite.config.ts --port 4173 --strictPort --host 127.0.0.1",
      cwd: "..",
      url: "http://127.0.0.1:4173/",
      reuseExistingServer: !process.env.CI,
    },
  }),
});
