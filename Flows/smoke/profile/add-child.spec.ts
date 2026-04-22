import { expect, test, type Page } from "@playwright/test";
import {
  cleanupTestChildIfPresent,
  loginWithTestUser,
  openProfileChildInformation,
} from "../../../utils/helpers/auth";

const addChildFlowData = {
  childFirstName: process.env.ADD_CHILD_CHILD_FIRST_NAME,
  childLastName: process.env.ADD_CHILD_CHILD_LAST_NAME,
  childPreferredName: process.env.ADD_CHILD_CHILD_PREFERRED_NAME,
  childBirthday: process.env.ADD_CHILD_CHILD_BIRTHDAY,
  childGrade: process.env.ADD_CHILD_CHILD_GRADE,
  childMedicalNotes: process.env.ADD_CHILD_CHILD_MEDICAL_NOTES,
  childAdditionalNotes: process.env.ADD_CHILD_CHILD_ADDITIONAL_NOTES,
  emergencyContactFirstName: process.env.ADD_CHILD_EMERGENCY_CONTACT_FIRST_NAME,
  emergencyContactLastName: process.env.ADD_CHILD_EMERGENCY_CONTACT_LAST_NAME,
  emergencyContactRelationship: process.env.ADD_CHILD_EMERGENCY_CONTACT_RELATIONSHIP,
  emergencyContactPhone: process.env.ADD_CHILD_EMERGENCY_CONTACT_PHONE,
  waiverSignatureName: process.env.ADD_CHILD_WAIVER_SIGNATURE_NAME,
};

for (const [key, value] of Object.entries(addChildFlowData)) {
  expect(value, `Missing required add-child flow environment variable: ${key}`).toBeTruthy();
}

const childDisplayName = `${addChildFlowData.childFirstName!} "${addChildFlowData.childPreferredName!}" ${addChildFlowData.childLastName!}`;
const childDisplayNamePattern = new RegExp(
  `${addChildFlowData.childFirstName!} "${addChildFlowData.childPreferredName!}" ${addChildFlowData.childLastName!}`,
  "i",
);
const emergencyContactDisplayName = `${addChildFlowData.emergencyContactFirstName!} ${addChildFlowData.emergencyContactLastName!}`;
const childBirthdayDisplayPattern = new RegExp(
  addChildFlowData.childBirthday!
    .replace(/^(\d{4})-(\d{2})-(\d{2})$/, "$2/$3/$1")
    .replace(/(^|\/)0/g, "$1"),
  "i",
);
const emergencyContactPhoneDisplayPattern = /\d{3}-\d{3}-\d{4}/;

async function expectChildCardToAppear(page: Page, childName: RegExp) {
  const childCard = page.locator("article").filter({
    has: page.getByRole("heading", { name: childName }),
  });

  try {
    await expect(childCard).toHaveCount(1, { timeout: 5_000 });
  } catch {
    await page.reload();
    await expect(childCard).toHaveCount(1);
  }

  return childCard;
}

test("Starts the add-child flow from the profile page", async ({ page }) => {
  // Configuration: navigate to the homepage, sign in with the shared smoke user, and remove any leftover test child before starting.
  await page.goto("/");
  await loginWithTestUser(page);
  await cleanupTestChildIfPresent(page, childDisplayNamePattern);
  await page.goto("/");
  await openProfileChildInformation(page);

  // Behavior: start the add-child flow from the profile page.
  await page.getByRole("button", { name: /add a child/i }).click();

  // Assertion: the add-child form opens with the expected heading and continue action.
  await expect(
    page.getByRole("heading", {
      name: /add your child's information\. child must be between 10-18 years old\./i,
    }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /^continue$/i })).toBeVisible();

  // Behavior: populate the add-child form with unmistakable test data.
  await page.getByRole("textbox", { name: /legal first name/i }).fill(addChildFlowData.childFirstName!);
  await page.getByRole("textbox", { name: /legal last name/i }).fill(addChildFlowData.childLastName!);
  await page.getByRole("textbox", { name: /preferred name/i }).fill(addChildFlowData.childPreferredName!);
  const birthdayInput = page.getByRole("textbox").nth(3);
  await birthdayInput.fill(addChildFlowData.childBirthday!);
  const gradeSelect = page.getByRole("combobox");
  await gradeSelect.selectOption(addChildFlowData.childGrade!);
  const photoConsentCheckbox = page.getByRole("checkbox", {
    name: /i allow wonderhood to use photos\/videos of my child/i,
  });
  await photoConsentCheckbox.check();
  await page
    .getByRole("textbox", { name: /list allergies\/medical accommodations/i })
    .fill(addChildFlowData.childMedicalNotes!);
  await page
    .getByRole("textbox", { name: /optional: please note any information/i })
    .fill(addChildFlowData.childAdditionalNotes!);

  // Assertion: the completed add-child form fields retain the expected values before continuing.
  await expect(page.getByRole("textbox", { name: /legal first name/i })).toHaveValue(
    addChildFlowData.childFirstName!,
  );
  await expect(page.getByRole("textbox", { name: /legal last name/i })).toHaveValue(
    addChildFlowData.childLastName!,
  );
  await expect(page.getByRole("textbox", { name: /preferred name/i })).toHaveValue(
    addChildFlowData.childPreferredName!,
  );
  await expect(birthdayInput).toHaveValue(addChildFlowData.childBirthday!);
  await expect(gradeSelect).toHaveValue(addChildFlowData.childGrade!);
  await expect(photoConsentCheckbox).toBeChecked();
  await expect(
    page.getByRole("textbox", { name: /list allergies\/medical accommodations/i }),
  ).toHaveValue(addChildFlowData.childMedicalNotes!);
  await expect(
    page.getByRole("textbox", { name: /optional: please note any information/i }),
  ).toHaveValue(addChildFlowData.childAdditionalNotes!);

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
  await page
    .getByRole("textbox", { name: /^first name$/i })
    .fill(addChildFlowData.emergencyContactFirstName!);
  await page
    .getByRole("textbox", { name: /^last name$/i })
    .fill(addChildFlowData.emergencyContactLastName!);
  await page
    .getByRole("textbox", { name: /relationship to child/i })
    .fill(addChildFlowData.emergencyContactRelationship!);
  await page
    .getByRole("textbox", { name: /phone number/i })
    .fill(addChildFlowData.emergencyContactPhone!);

  // Assertion: the first emergency contact fields retain the expected values.
  await expect(page.getByRole("textbox", { name: /^first name$/i })).toHaveValue(
    addChildFlowData.emergencyContactFirstName!,
  );
  await expect(page.getByRole("textbox", { name: /^last name$/i })).toHaveValue(
    addChildFlowData.emergencyContactLastName!,
  );
  await expect(page.getByRole("textbox", { name: /relationship to child/i })).toHaveValue(
    addChildFlowData.emergencyContactRelationship!,
  );
  await expect(page.getByRole("textbox", { name: /phone number/i })).toHaveValue(
    emergencyContactPhoneDisplayPattern,
  );

  // Behavior: continue from the completed emergency contact step.
  await page.getByRole("button", { name: /^continue$/i }).click();

  // Assertion: the liability waiver step opens with the waiver heading, required signature prompt, and a disabled submit action.
  await expect(
    page.getByRole("heading", {
      name: /liability waiver/i,
    }),
  ).toBeVisible();
  await expect(page.getByText(/parent\/guardian full legal name/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /^submit$/i })).toBeDisabled();

  // Behavior: open each liability waiver section in sequence so the required acknowledgements become available.
  await page.getByText(/^1\. WonderHood Project/i).click();
  await page.getByText(/^2\. Assumption of Risk$/i).click();
  await page.getByText(/^3\. Release.*Minor Rights$/i).click();
  await page.getByText(/^4\. Release.*Parent\/Guardian Rights$/i).click();
  await page.getByText(/^5\. Application$/i).click();
  await page.getByText(/^6\. Indemnification$/i).click();
  await page.getByText(/^7\. Medical Treatment and Consent to Pay Expenses$/i).click();
  await page.getByText(/^8\. Photo and Recording Notice$/i).click();
  await page.getByText(/^9\. Miscellaneous$/i).click();
  await page.getByText(/^10\. By Signing Below, I Attest As Follows$/i).click();

  // Behavior: acknowledge each expanded liability waiver section so the final waiver agreement can be completed.
  await page.getByRole("checkbox", { name: /i have read and understand this section\./i }).nth(0).check();
  await page.getByRole("checkbox", { name: /i have read and understand this section\./i }).nth(1).check();
  await page.getByRole("checkbox", { name: /i have read and understand this section\./i }).nth(2).check();
  await page.getByRole("checkbox", { name: /i have read and understand this section\./i }).nth(3).check();
  await page.getByRole("checkbox", { name: /i have read and understand this section\./i }).nth(4).check();
  await page.getByRole("checkbox", { name: /i have read and understand this section\./i }).nth(5).check();
  await page.getByRole("checkbox", { name: /i have read and understand this section\./i }).nth(6).check();
  await page.getByRole("checkbox", { name: /i have read and understand this section\./i }).nth(7).check();
  await page.getByRole("checkbox", { name: /i have read and understand this section\./i }).nth(8).check();
  await page.getByRole("checkbox", { name: /i have read and understand this section\./i }).nth(9).check();

  // Behavior: provide the parent or guardian legal name and accept the final liability waiver agreement.
  await page
    .getByRole("textbox", { name: /parent\/guardian full legal name/i })
    .fill(addChildFlowData.waiverSignatureName!);
  await page
    .getByRole("checkbox", {
      name: /i have read and agree to the wonderhood liability waiver version/i,
    })
    .check();

  // Assertion: the completed liability waiver enables submission.
  await expect(page.getByRole("button", { name: /^submit$/i })).toBeEnabled();

  // Behavior: submit the completed liability waiver to continue the add-child flow.
  await page.getByRole("button", { name: /^submit$/i }).click();

  // Assertion: the add-child flow reaches the confirmation page with the expected success actions.
  await expect(
    page.getByRole("heading", { name: /child added successfully/i }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /download pdf copy/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^done$/i })).toBeVisible();

  // Behavior: finish the add-child confirmation step and return to the profile child information view.
  await page.getByRole("button", { name: /^done$/i }).click();

  // Assertion: the created child appears in the child information list with the expected details and actions.
  const childCard = await expectChildCardToAppear(page, childDisplayNamePattern);
  await expect(
    childCard.getByRole("heading", { name: childDisplayNamePattern }),
  ).toBeVisible();
  await expect(childCard.getByText(childBirthdayDisplayPattern)).toBeVisible();
  await expect(childCard.getByText(new RegExp(`^${addChildFlowData.childGrade!}$`))).toBeVisible();
  await expect(childCard.getByText(/^homeschool$/i)).toBeVisible();
  await expect(
    childCard.getByText(new RegExp(`contact: ${emergencyContactDisplayName}`, "i")),
  ).toBeVisible();
  await expect(childCard.getByRole("button", { name: /edit child/i })).toBeVisible();
  await expect(childCard.getByRole("button", { name: /delete child/i })).toBeVisible();

  // Behavior: delete the created child so the production smoke flow remains repeatable.
  await childCard.getByRole("button", { name: /delete child/i }).click();
  await page.getByRole("button", { name: /^delete$/i }).click();

  // Assertion: the child information page remains available and the deleted test child no longer appears in the list.
  await expect(
    page.getByRole("heading", { name: /your children's information/i }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /add a child/i })).toBeVisible();
  await expect(
    page.locator("article").filter({ has: page.getByRole("heading", { name: childDisplayNamePattern }) }),
  ).toHaveCount(0);
});
