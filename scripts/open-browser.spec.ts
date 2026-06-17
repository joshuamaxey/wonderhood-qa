import { expect, test } from "@playwright/test";
import {
  dismissCookieBanner,
  loginWithTestUser,
} from "../utils/helpers/auth";

const targetPath = process.env.OPEN_BROWSER_PATH || "/events";

test("opens a browser session for manual exploration", async ({ page }) => {
  // Configuration: navigate to the requested page in the configured WonderHood environment.
  await page.goto(targetPath);

  // Behavior: reuse the shared cookie helper so the banner does not block manual exploration.
  await dismissCookieBanner(page);

  // Assertion: the cookie banner is no longer visible after the shared helper runs.
  await expect(page.locator(".CookieConsent")).toBeHidden();

  if (process.env.OPEN_BROWSER_LOGIN === "1") {
    // Behavior: reuse the shared login helper when an authenticated browser session is requested.
    await loginWithTestUser(page);
  }

  if (process.env.OPEN_BROWSER_PAUSE !== "0") {
    // Behavior: keep the prepared browser open in Playwright Inspector for manual exploration.
    await page.pause();
  }
});
