import { expect, test } from "@playwright/test";
import { loginWithTestUser } from "../../../utils/helpers/auth";

test.describe("authentication smoke flows", () => {
  test("login flow signs in from the homepage", async ({ page }) => {
    // Configuration: navigate to the homepage so the smoke login flow starts from the public site entry point.
    await page.goto("/");

    // Behavior: dismiss the cookie banner and submit the shared test user credentials through the login form.
    await loginWithTestUser(page);

    // Assertion: authenticated header controls are visible after the user signs in successfully.
    await expect(page).toHaveURL(/\/?$/);
    await expect(page.getByRole("button", { name: /notifications/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /j joshua/i })).toBeVisible();
  });
});
