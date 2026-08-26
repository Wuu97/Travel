import { defineConfig } from "@playwright/test";

const cachedChromium = "/Users/lynnwuu/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell";

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://127.0.0.1:4173", trace: "on-first-retry", launchOptions: { executablePath: cachedChromium } },
  webServer: { command: "npm run start -- --port 4173", url: "http://127.0.0.1:4173", reuseExistingServer: true },
});
