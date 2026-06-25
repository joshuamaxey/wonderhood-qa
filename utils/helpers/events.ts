import { expect, type Page } from "@playwright/test";

export async function unenrollChildFromEventIfPresent(page: Page, childName: RegExp) {
  const manageEnrollmentButton = page.getByRole("button", { name: /manage enrollment/i });

  if (!(await manageEnrollmentButton.isVisible().catch(() => false))) {
    return;
  }

  try {
    await manageEnrollmentButton.click();
    await expect(page.getByText(/select your child\(ren\) to enroll/i)).toBeVisible();

    const unenrollButton = page.getByRole("button", { name: /^unenroll$/i });

    await expect(page.getByText(childName)).toBeVisible();

    if (await unenrollButton.isVisible().catch(() => false)) {
      await unenrollButton.click();
      await expect(page.getByText(/0 of 20 enrolled/i)).toBeVisible();
    }

    const cancelButton = page.getByRole("button", { name: /^cancel$/i });
    if (await cancelButton.isVisible().catch(() => false)) {
      await cancelButton.click();
    }
  } catch {
    // If the enrollment controls are absent or already reset, let the caller continue.
  } finally {
    await page.reload();
  }
}
