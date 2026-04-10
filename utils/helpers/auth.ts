import { expect, type Page } from "@playwright/test";

export async function dismissCookieBanner(page: Page) {
  const acceptCookiesButton = page.getByRole("button", { name: /accept cookies/i });

  await expect(page.getByText(/we use cookies to improve the site/i)).toBeVisible();
  await acceptCookiesButton.click();
}

export async function loginWithTestUser(page: Page) {
  const testUserEmail = process.env.TEST_USER1;
  const testUserPassword = process.env.TEST_USER1_PASS;

  expect(testUserEmail, "TEST_USER1 must be set in .env for the auth smoke flow.").toBeTruthy();
  expect(testUserPassword, "TEST_USER1_PASS must be set in .env for the auth smoke flow.").toBeTruthy();

  await dismissCookieBanner(page);
  await page.getByRole("button", { name: /^login$/i }).click();
  await page.getByRole("textbox", { name: /email address/i }).fill(testUserEmail!);
  await page.getByRole("textbox", { name: /enter your password/i }).fill(testUserPassword!);
  await page.getByRole("button", { name: /^sign in$/i }).click();
}
