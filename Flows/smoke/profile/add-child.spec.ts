import { expect, test } from "@playwright/test";
import { loginWithTestUser, waitForProfileReady } from "../../../utils/helpers/auth";

test("Starts the add-child flow from the profile page", async ({ page }) => {
  // Configuration: navigate to the homepage, sign in with the shared smoke user, and open the profile page.
  await page.goto("/");
  await loginWithTestUser(page);
  await page.getByRole("button", { name: /j joshua/i }).click();
  await page.getByRole("link", { name: /^profile$/i }).click();
  await waitForProfileReady(page);

  // Behavior: start the add-child flow from the profile page.
  await page.getByRole("link", { name: /add a child/i }).click();

  // Assertion: the child information page opens with the add-child entry point visible.
  await expect(
    page.getByRole("heading", { name: /your children's information/i }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /add a child/i })).toBeVisible();

  // Behavior: open the child information form from the child information page.
  await page.getByRole("button", { name: /add a child/i }).click();

  // Assertion: the add-child form opens with the expected heading and continue action.
  await expect(
    page.getByRole("heading", {
      name: /add your child's information\. child must be between 10-18 years old\./i,
    }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /^continue$/i })).toBeVisible();

  // Behavior: populate the child name fields with unmistakable test data before entering the birthday.
  await page.getByRole("textbox", { name: /legal first name/i }).fill("Test");
  await page.getByRole("textbox", { name: /legal last name/i }).fill("Child");
  await page.getByRole("textbox", { name: /preferred name/i }).fill("Testing");

  // Assertion: the child name fields retain the provided test values before the birthday step.
  await expect(page.getByRole("textbox", { name: /legal first name/i })).toHaveValue("Test");
  await expect(page.getByRole("textbox", { name: /legal last name/i })).toHaveValue("Child");
  await expect(page.getByRole("textbox", { name: /preferred name/i })).toHaveValue("Testing");

  // Behavior: enter the child's birthday using the digit-only date input format.
  const birthdayInput = page.getByLabel(/birthday/i);
  await birthdayInput.fill("05012014");

  // Assertion: the birthday field retains the provided child birth date.
  await expect(birthdayInput).toHaveValue(/05.*01.*2014|2014-05-01/);
});
