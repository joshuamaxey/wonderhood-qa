import { expect, test } from "@playwright/test";
import { dismissCookieBanner } from "../../../utils/helpers/auth";

test("events page displays public events and programs content", async ({ page }) => {
  // Configuration: navigate to the public Events page and wait for the page content to finish loading.
  await page.goto("/events");
  await expect(page.getByText(/upcoming events/i)).toBeVisible();
  await dismissCookieBanner(page);

  // Behavior: view the public Events page sections after the cookie banner is handled.
  await page.getByText(/^events$/i).nth(1).scrollIntoViewIfNeeded();

  // Assertion: the Events page shows the expected page copy, sections, and event detail actions.
  await expect(page).toHaveURL(/\/events$/);
  await expect(page.getByText(/connect with other homeschooling families/i)).toBeVisible();
  await expect(page.getByText(/^events$/i).nth(1)).toBeVisible();
  await expect(page.getByText(/^programs$/i)).toBeVisible();
  await expect(page.getByText(/max participants:/i).first()).toBeVisible();
  await expect(page.getByText(/view details/i).first()).toBeVisible();
  await expect(page.getByRole("contentinfo")).toBeVisible();
});
