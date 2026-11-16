import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  timeout: 60000,
  use: {
    baseURL: "http://127.0.0.1:5174",
    headless: true,
    locale: "vi-VN",
    timezoneId: "Asia/Ho_Chi_Minh",
    screenshot: "only-on-failure",
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    },
  },
  webServer: {
    command:
      process.platform === "win32"
        ? "npm.cmd run dev -- --port 5174 --strictPort"
        : "npm run dev -- --port 5174 --strictPort",
    url: "http://127.0.0.1:5174",
    reuseExistingServer: !process.env.CI,
  },
  reporter: "list",
});
