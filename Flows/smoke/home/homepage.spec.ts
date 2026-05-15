import { test, expect } from "@playwright/test";

test("homepage loads and displays main heading", async ({ page }) => {
  // Configuration: navigate to the homepage and dismiss the cookie banner if it is shown.
  await page.goto("/");

  const acceptCookiesButton = page.getByRole("button", { name: /accept cookies/i });
  if (await acceptCookiesButton.isVisible()) {
    await acceptCookiesButton.click();
  }

  // Behavior: load the homepage experience after the initial cookie prompt is handled.
  await expect(page).toHaveURL(/\/?$/);

  // Assertion: the WonderHood brand link is visible in the site header.
  await expect(page.getByRole("link", { name: /wonderhood/i }).first()).toBeVisible();
});

test("homepage shows expected primary headings and donate button", async ({ page }) => {
  // Configuration: navigate to the homepage and dismiss the cookie banner if it is shown.
  await page.goto("/");

  const acceptCookiesButton = page.getByRole("button", { name: /accept cookies/i });
  if (await acceptCookiesButton.isVisible()) {
    await acceptCookiesButton.click();
  }

  // Behavior: view the homepage sections that present the primary informational headings.
  await page.getByRole("heading", { level: 2, name: /empowering families through connection/i }).scrollIntoViewIfNeeded();

  // Assertion: the expected primary headings are visible on the homepage.
  await expect(page.getByRole("button", { name: /show donation panel/i })).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: /empowering families through connection/i }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: /our story.*mission/i })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: /how to join/i })).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: /wonderhood learning experiences/i }),
  ).toBeVisible();
});

test("homepage shows expected footer elements", async ({ page }) => {
  // Configuration: navigate to the homepage and dismiss the cookie banner if it is shown.
  await page.goto("/");

  const acceptCookiesButton = page.getByRole("button", { name: /accept cookies/i });
  if (await acceptCookiesButton.isVisible()) {
    await acceptCookiesButton.click();
  }

  // Behavior: move to the footer section where the primary site links are presented.
  await page.getByRole("contentinfo").scrollIntoViewIfNeeded();

  // Assertion: the expected footer links are visible on the homepage.
  const footer = page.getByRole("contentinfo");
  await expect(footer.getByRole("link", { name: /support us/i })).toBeVisible();
  await expect(footer.getByRole("link", { name: /partner with us/i })).toBeVisible();
  await expect(footer.getByRole("link", { name: /volunteer/i })).toBeVisible();
  await expect(footer.getByRole("link", { name: /^faq$/i })).toBeVisible();
  await expect(footer.getByRole("link", { name: /contact us/i })).toBeVisible();
  await expect(footer.getByRole("link", { name: /privacy policy/i })).toBeVisible();
  await expect(footer.getByRole("link", { name: /anti discrimination policy/i })).toBeVisible();
  await expect(footer.getByRole("link", { name: /terms of service/i })).toBeVisible();
  await expect(footer.getByRole("link", { name: /facebook/i })).toBeVisible();
  await expect(footer.getByRole("link", { name: /linkedin/i })).toBeVisible();
});

test("homepage shows header navigation, header actions, primary cta, and cookie banner", async ({ page }) => {
  // Configuration: navigate to the homepage before interacting with the initial cookie prompt.
  await page.goto("/");

  const acceptCookiesButton = page.getByRole("button", { name: /accept cookies/i });

  // Behavior: confirm the cookie banner is shown, then dismiss it to continue using the homepage.
  await expect(page.getByText(/we use cookies to improve the site/i)).toBeVisible();
  await expect(acceptCookiesButton).toBeVisible();
  await acceptCookiesButton.click();

  // Assertion: the primary header navigation, header actions, and homepage call to action are visible after the banner is dismissed.
  await expect(page.getByRole("link", { name: /^about$/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /^events$/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /^get involved$/i }).nth(0)).toBeVisible();
  await expect(page.getByRole("button", { name: /^login$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^sign up$/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /^get involved$/i }).nth(1)).toBeVisible();
});
