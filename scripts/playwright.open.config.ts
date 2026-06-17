import { defineConfig } from "@playwright/test";
import baseConfig from "../playwright.config";

export default defineConfig({
  ...baseConfig,
  testDir: ".",
  testMatch: "open-browser.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 0,
  reporter: [["list"]],
});
