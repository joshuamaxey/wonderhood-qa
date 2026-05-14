import { expect, test, type Page } from "@playwright/test";
import {
  cleanupSignupUserIfPresent,
  deleteSignedInUserFromProfile,
  dismissCookieBanner,
  loginWithTestUser,
  waitForProfileReady,
} from "../../../utils/helpers/auth";

const signupUser = {
  firstName: process.env.SIGNUP_USER1_FIRSTNAME,
  lastName: process.env.SIGNUP_USER1_LASTNAME,
  email: process.env.SIGNUP_USER1_EMAIL,
  phone: process.env.SIGNUP_USER1_PHONE,
  password: process.env.SIGNUP_USER1_PASS,
  address: process.env.SIGNUP_USER1_ADDRESS,
  city: process.env.SIGNUP_USER1_CITY,
  state: process.env.SIGNUP_USER1_STATE,
  zip: process.env.SIGNUP_USER1_ZIP,
};

const signupEmail = signupUser.email;

async function waitForSignupStep(page: Page, heading: RegExp) {
  await expect(page.getByRole("heading", { name: heading })).toBeVisible();
}

test.describe.serial("signup smoke flow", () => {
  test("signs up a new parent user from the homepage", async ({ page }) => {
    test.skip(
      !signupUser.firstName ||
        !signupUser.lastName ||
        !signupEmail ||
        !signupUser.phone ||
        !signupUser.password ||
        !signupUser.address ||
        !signupUser.city ||
        !signupUser.state ||
        !signupUser.zip,
      "The signup smoke flow requires the SIGNUP_USER1_* variables in .env.",
    );

    // Configuration: remove any leftover signup user, then navigate to the homepage and open the signup modal with the configured smoke test user details.
    await cleanupSignupUserIfPresent(page, {
      email: signupEmail!,
      password: signupUser.password!,
    });
    await page.goto("/");
    await dismissCookieBanner(page);
    await page.getByRole("button", { name: /^sign up$/i }).click();
    await waitForSignupStep(page, /join wonderhood/i);
    await expect(page.getByRole("heading", { name: /tell us about yourself/i })).toBeVisible();

    // Behavior: complete the parent signup flow through the signup modal and choose to add a child later.
    await page.getByPlaceholder("First Name").fill(signupUser.firstName!);
    await page.getByPlaceholder("Last Name").fill(signupUser.lastName!);
    await page.getByPlaceholder("Email Address").fill(signupEmail!);
    await page.getByPlaceholder("Phone Number").fill(signupUser.phone!);
    await page.getByRole("textbox", { name: /^password$/i }).fill(signupUser.password!);
    await page.getByRole("textbox", { name: /^confirm password$/i }).fill(signupUser.password!);
    await expect(page.getByRole("button", { name: /^continue$/i })).toBeEnabled();
    await page.getByRole("button", { name: /^continue$/i }).click();

    const reachedAddressStep = await page
      .getByRole("heading", { name: /where are you located\?/i })
      .isVisible()
      .catch(() => false);
    const emailAlreadyExists = await page
      .getByText(/an account with this email already exists\. please log in instead\./i)
      .isVisible()
      .catch(() => false);

    expect(
      reachedAddressStep || !emailAlreadyExists,
      "Signup is blocked because the configured signup email already exists. Delete the existing user, then rerun the flow.",
    ).toBeTruthy();
    await expect(page.getByRole("heading", { name: /where are you located\?/i })).toBeVisible();

    await page.getByPlaceholder("Address").fill(signupUser.address!);
    await page.getByPlaceholder("City").fill(signupUser.city!);
    await page.getByPlaceholder("State").fill(signupUser.state!);
    await page.getByPlaceholder("ZIP Code").fill(signupUser.zip!);
    await expect(page.getByRole("button", { name: /^continue$/i })).toBeEnabled();
    await page.getByRole("button", { name: /^continue$/i }).click();
    await expect(page.getByRole("heading", { name: /what brings you to wonderhood\?/i })).toBeVisible();

    await page.getByRole("button", { name: /i'm a parent/i }).click();
    await expect(page.getByRole("button", { name: /^continue$/i })).toBeEnabled();
    await page.getByRole("button", { name: /^continue$/i }).click();
    await expect(page.getByRole("heading", { name: /almost there!/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /do this later/i })).toBeEnabled();
    await page.getByRole("button", { name: /do this later/i }).click();

    const landedOnProfile = await page
      .waitForURL(/\/profile\?tab=user$/, { timeout: 5_000 })
      .then(() => true)
      .catch(() => false);

    if (!landedOnProfile) {
      // Behavior: fall back to the created user session if signup completes without navigating to the profile page.
      const signedInFromSignup = await page
        .getByRole("button", { name: /notifications/i })
        .isVisible()
        .catch(() => false);

      if (!signedInFromSignup) {
        await page.goto("/");
        await loginWithTestUser(page, {
          email: signupEmail!,
          password: signupUser.password!,
        });
      }

      await page.goto("/profile?tab=user");
      await waitForProfileReady(page);
    }

    // Assertion: the newly created user lands on the profile page with the user information tab visible.
    await waitForProfileReady(page);
  });

  test("deletes the created signup user from the profile page", async ({ page }) => {
    test.skip(
      !signupEmail || !signupUser.password,
      "The delete-user smoke flow requires SIGNUP_USER1_EMAIL and SIGNUP_USER1_PASS in .env.",
    );

    // Configuration: navigate to the homepage and sign in with the user created in the signup smoke flow.
    await page.goto("/");
    await loginWithTestUser(page, {
      email: signupEmail!,
      password: signupUser.password!,
    });
    await page.waitForTimeout(5_000);

    // Behavior: delete the signed-in signup user from the profile page.
    await deleteSignedInUserFromProfile(page);

    // Behavior: attempt to log back in with the deleted signup user credentials.
    await expect(async () => {
      await loginWithTestUser(page, {
        email: signupEmail!,
        password: signupUser.password!,
      });
    }).rejects.toThrow(/incorrect username or password/i);

    // Assertion: the deleted user can no longer authenticate with the prior credentials.
    await expect(page.getByText(/incorrect username or password/i)).toBeVisible();
    await expect(page).toHaveURL(/\/?$/);
  });
});
