import { expect, test, type Page } from "@playwright/test";
import {
  dismissCookieBanner,
  loginWithTestUser,
} from "../../../utils/helpers/auth";
import { unenrollChildFromEventIfPresent } from "../../../utils/helpers/events";

const eventRegistrationData = {
  userEmail: process.env.EVENT_REGISTRATION_USER_EMAIL,
  userPassword: process.env.EVENT_REGISTRATION_USER_PASSWORD,
};

for (const [key, value] of Object.entries(eventRegistrationData)) {
  expect(value, `Missing required event registration environment variable: ${key}`).toBeTruthy();
}

const eventNamePattern = /bridging the gap: parent–teen dialogue/i;
const childNamePattern = /test child 1 maxey/i;

async function openBridgingTheGapEvent(page: Page) {
  const eventCard = page.locator("article").filter({
    hasText: eventNamePattern,
  });

  await expect(eventCard).toHaveCount(1);
  await eventCard.getByRole("link", { name: /view details/i }).click();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /bridging the gap: parent–teen dialogue in westcliffe/i,
    }),
  ).toBeVisible();
}

test("WonderHood event registration enrolls a child from the event detail page", async ({ page }) => {
  // Configuration: navigate to the homepage, sign in with the event registration user, and open the target event detail page.
  await page.goto("/");
  await loginWithTestUser(page, {
    email: eventRegistrationData.userEmail,
    password: eventRegistrationData.userPassword,
  });
  await page.goto("/events");
  await expect(page.getByText(/upcoming events/i)).toBeVisible();
  await dismissCookieBanner(page);
  await openBridgingTheGapEvent(page);

  // Configuration: remove any existing enrollment for this child so the registration flow starts from a known baseline.
  await unenrollChildFromEventIfPresent(page, childNamePattern);
  await expect(page.getByText(/0 of 20 enrolled/i)).toBeVisible();
  await expect(page.getByText(/20 spots left/i)).toBeVisible();

  try {
    // Behavior: open the in-house enrollment picker, choose the child, and submit enrollment.
    await page.getByRole("button", { name: /enroll in event/i }).click();
    await expect(page.getByText(/select your child\(ren\) to enroll/i)).toBeVisible();
    const childOption = page.locator("label").filter({
      hasText: childNamePattern,
    });
    await childOption.getByRole("checkbox").check();
    await expect(page.getByRole("button", { name: /^enroll$/i })).toBeEnabled();
    await page.getByRole("button", { name: /^enroll$/i }).click();

    // Assertion: the event detail page shows the child is enrolled and capacity has updated.
    await expect(page.getByRole("button", { name: /enrolled/i })).toBeDisabled();
    await expect(page.getByRole("button", { name: /manage enrollment/i })).toBeVisible();
    await expect(page.getByText(/enrollment successful!/i)).toBeVisible();
    await expect(
      page.getByText(/your child is enrolled\. manage or update enrollment here\./i),
    ).toBeVisible();
    await expect(page.getByText(/1 of 20 enrolled/i)).toBeVisible();
    await expect(page.getByText(/19 spots left/i)).toBeVisible();
  } finally {
    // Configuration: clean up the created enrollment so the smoke flow remains repeatable.
    await unenrollChildFromEventIfPresent(page, childNamePattern);
  }

  // Assertion: the event registration state returns to the unenrolled baseline after cleanup.
  await expect(page.getByRole("button", { name: /enroll in event/i })).toBeVisible();
  await expect(page.getByText(/0 of 20 enrolled/i)).toBeVisible();
  await expect(page.getByText(/20 spots left/i)).toBeVisible();
});
