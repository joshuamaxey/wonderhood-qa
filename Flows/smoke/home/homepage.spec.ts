import { test, expect } from "@playwright/test";

test("homepage loads and displays main heading", async ({ page }) => {
  await page.goto("/");

  // Verify URL
  await expect(page).toHaveURL(/whproject\.org/);

  // Verify a visible heading
  await expect(
    page.getByRole("heading", { name: /wonderhood/i }),
  ).toBeVisible();
});