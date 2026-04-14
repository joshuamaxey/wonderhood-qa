import { expect, type Page } from "@playwright/test";

export async function dismissCookieBanner(page: Page) {
  const acceptCookiesButton = page.getByRole("button", { name: /accept cookies/i });
  if (await acceptCookiesButton.isVisible()) {
    await expect(page.getByText(/we use cookies to improve the site/i)).toBeVisible();
    await acceptCookiesButton.click();
  }
}

type LoginOptions = {
  email?: string;
  password?: string;
};

export async function loginWithTestUser(page: Page, options: LoginOptions = {}) {
  const testUserEmail = options.email ?? process.env.TEST_USER1;
  const testUserPassword = options.password ?? process.env.TEST_USER1_PASS;

  expect(
    testUserEmail,
    "A login email must be provided or TEST_USER1 must be set in .env for the auth smoke flow.",
  ).toBeTruthy();
  expect(
    testUserPassword,
    "A login password must be provided or TEST_USER1_PASS must be set in .env for the auth smoke flow.",
  ).toBeTruthy();

  await dismissCookieBanner(page);
  await page.getByRole("button", { name: /^login$/i }).click();

  const loginHeading = page.getByRole("heading", { name: /welcome back/i });
  const emailField = page.getByRole("textbox", { name: /email address/i });
  const passwordField = page.getByPlaceholder(/enter your password/i);
  const signInButton = page.getByRole("button", { name: /^sign in$/i });

  await expect(loginHeading).toBeVisible();
  await expect(emailField).toBeVisible();
  await expect(passwordField).toBeVisible();
  await emailField.fill(testUserEmail!);
  await passwordField.fill(testUserPassword!);
  await expect(signInButton).toBeEnabled();
  await signInButton.click();

  const loginError = page.getByText(/incorrect username or password/i);
  const notificationsButton = page.getByRole("button", { name: /notifications/i });

  await Promise.race([
    expect(notificationsButton).toBeVisible({ timeout: 10_000 }),
    expect(loginError).toBeVisible({ timeout: 10_000 }),
  ]);

  if (await loginError.isVisible().catch(() => false)) {
    throw new Error(`Login failed for ${testUserEmail}: incorrect username or password.`);
  }

  await expect(loginHeading).toBeHidden();
}

export async function waitForProfileReady(page: Page) {
  await expect(page).toHaveURL(/\/profile\?tab=user$/);
  await expect(
    page.getByRole("tab", { name: /user information/i }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("button", { name: /more actions/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /more actions/i })).toBeEnabled();
  await expect(page.getByRole("link", { name: /add a child/i })).toBeVisible();
}
