import { expect, test } from "@playwright/test";
import { loginWithTestUser } from "../../../utils/helpers/auth";

test("Log in and log out from the homepage", async ({ page }) => {
  // Configuration: navigate to the homepage so the smoke login flow starts from the public site entry point.
  await page.goto("/");

  // Behavior: dismiss the cookie banner and submit the shared test user credentials through the login form.
  await loginWithTestUser(page);

  // Assertion: authenticated header controls are visible after the user signs in successfully.
  await expect(page).toHaveURL(/\/?$/);
  await expect(
    page.getByRole("button", { name: /notifications/i }),
  ).toBeVisible();
  const profileMenuButton = page.getByRole("navigation").getByRole("button").nth(1);
  await expect(profileMenuButton).toBeVisible();

  // Behavior: open the authenticated profile menu and choose the logout action.
  await profileMenuButton.click();
  await page.getByRole("button", { name: /logout/i }).click();

  // Assertion: public header controls return after the user signs out successfully.
  await expect(page.getByRole("button", { name: /^login$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^sign up$/i })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /notifications/i }),
  ).toBeHidden();
});
