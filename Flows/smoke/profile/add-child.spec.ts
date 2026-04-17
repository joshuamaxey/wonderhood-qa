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

  // Behavior: populate the add-child form with unmistakable test data.
  await page.getByRole("textbox", { name: /legal first name/i }).fill("Test");
  await page.getByRole("textbox", { name: /legal last name/i }).fill("Child");
  await page.getByRole("textbox", { name: /preferred name/i }).fill("Testing");
  const birthdayInput = page.getByRole("textbox").nth(3);
  await birthdayInput.fill("2014-05-01");
  const gradeSelect = page.getByRole("combobox");
  await gradeSelect.selectOption("9");
  const photoConsentCheckbox = page.getByRole("checkbox", {
    name: /i allow wonderhood to use photos\/videos of my child/i,
  });
  await photoConsentCheckbox.check();
  await page
    .getByRole("textbox", { name: /list allergies\/medical accommodations/i })
    .fill("N/A");
  await page
    .getByRole("textbox", { name: /optional: please note any information/i })
    .fill("None");

  // Assertion: the completed add-child form fields retain the expected values before continuing.
  await expect(page.getByRole("textbox", { name: /legal first name/i })).toHaveValue("Test");
  await expect(page.getByRole("textbox", { name: /legal last name/i })).toHaveValue("Child");
  await expect(page.getByRole("textbox", { name: /preferred name/i })).toHaveValue("Testing");
  await expect(birthdayInput).toHaveValue(/05.*01.*2014|2014-05-01/);
  await expect(gradeSelect).toHaveValue("9");
  await expect(photoConsentCheckbox).toBeChecked();
  await expect(
    page.getByRole("textbox", { name: /list allergies\/medical accommodations/i }),
  ).toHaveValue("N/A");
  await expect(
    page.getByRole("textbox", { name: /optional: please note any information/i }),
  ).toHaveValue("None");

  // Behavior: continue from the completed child information step to the emergency contact step.
  await page.getByRole("button", { name: /^continue$/i }).click();

  // Assertion: the emergency contact step opens with the expected heading and navigation controls.
  await expect(
    page.getByRole("heading", {
      name: /emergency contact/i,
    }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /^back$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^continue$/i })).toBeVisible();

  // Behavior: complete the first emergency contact entry with unmistakable test contact details.
  await page.getByRole("textbox", { name: /^first name$/i }).fill("Test");
  await page.getByRole("textbox", { name: /^last name$/i }).fill("User");
  await page.getByRole("textbox", { name: /relationship to child/i }).fill("Parent");
  await page.getByRole("textbox", { name: /phone number/i }).fill("1234567890");

  // Assertion: the first emergency contact fields retain the expected values.
  await expect(page.getByRole("textbox", { name: /^first name$/i })).toHaveValue("Test");
  await expect(page.getByRole("textbox", { name: /^last name$/i })).toHaveValue("User");
  await expect(page.getByRole("textbox", { name: /relationship to child/i })).toHaveValue("Parent");
  await expect(page.getByRole("textbox", { name: /phone number/i })).toHaveValue("123-456-7890");

  // Behavior: continue from the completed emergency contact step.
  await page.getByRole("button", { name: /^continue$/i }).click();
});
