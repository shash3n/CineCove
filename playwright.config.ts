import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  timeout: 60000,
  use: {
    baseURL: process.env.CINEVAULT_TEST_URL || "http://127.0.0.1:5173",
    headless: true,
    channel: "chrome",
    actionTimeout: 10000,
    trace: "retain-on-failure",
  },
  workers: 1,
  reporter: "list",
});
