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
  await expect(page).toHaveURL(/\/profile(\?tab=user)?$/);
  await expect(
    page.getByRole("tab", { name: /user information/i }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("button", { name: /more actions/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /more actions/i })).toBeEnabled();
  const addChildEntry = page
    .getByRole("link", { name: /add a child/i })
    .or(page.getByRole("button", { name: /add a child/i }));
  await expect(addChildEntry).toBeVisible();
}

export async function openProfileChildInformation(page: Page) {
  await page.getByRole("button", { name: /j joshua/i }).click();
  await page.getByRole("link", { name: /^profile$/i }).click();
  await waitForProfileReady(page);
  await page.getByRole("tab", { name: /child's information/i }).click();
  await expect(
    page.getByRole("tab", { name: /child's information/i }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("heading", { name: /your children's information/i }),
  ).toBeVisible();
}

export async function cleanupTestChildIfPresent(page: Page, childHeading: RegExp) {
  const childCard = page.locator("article").filter({
    has: page.getByRole("heading", { name: childHeading }),
  });

  await openProfileChildInformation(page);

  try {
    await expect(childCard).toHaveCount(1, { timeout: 5_000 });
  } catch {
    await expect(childCard).toHaveCount(0);
    return;
  }

  await childCard.getByRole("button", { name: /delete child/i }).click();
  await expect(page.getByRole("heading", { name: /delete child/i })).toBeVisible();
  await page.getByRole("button", { name: /^delete$/i }).click();
  await expect(childCard).toHaveCount(0);
}
