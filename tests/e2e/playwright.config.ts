import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  forbidOnly: true,
  fullyParallel: false,
  outputDir: "/tmp/promptube-playwright-output",
  reporter: [["line"]],
  retries: 0,
  testDir: ".",
  timeout: 300_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://admin-test-reverse-proxy:8080",
    screenshot: "off",
    trace: "off",
    video: "off",
    ...devices["Desktop Chrome"],
  },
  workers: 1,
});
