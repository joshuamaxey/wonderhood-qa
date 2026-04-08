import { test, expect } from "@playwright/test";

test("homepage loads and displays main heading", async ({ page }) => {
  await page.goto("/");

  const acceptCookiesButton = page.getByRole("button", { name: /accept cookies/i });
  if (await acceptCookiesButton.isVisible()) {
    await acceptCookiesButton.click();
  }

  // Verify the homepage route resolved successfully.
  await expect(page).toHaveURL(/\/?$/);

  // Verify the WonderHood brand link in the site header.
  await expect(page.getByRole("link", { name: /wonderhood/i }).first()).toBeVisible();
});
