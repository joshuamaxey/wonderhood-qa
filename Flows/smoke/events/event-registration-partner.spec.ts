import { expect, test } from "@playwright/test";
import { dismissCookieBanner } from "../../../utils/helpers/auth";

test("partner event registration opens the Dino Yoga partner website", async ({ page }) => {
  // Configuration: navigate to the public Events page and locate the Dino Yoga partner event.
  await page.goto("/events");
  await expect(page.getByText(/upcoming events/i)).toBeVisible();
  await dismissCookieBanner(page);
  const dinoYogaEventCard = page.locator("article").filter({
    hasText: /dino yoga with diana laughlin/i,
  });
  await expect(dinoYogaEventCard).toHaveCount(1);

  // Behavior: open the Dino Yoga event detail page from the event card.
  await dinoYogaEventCard.getByText(/^view details$/i).click();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /dino yoga with diana laughlin in westcliffe/i,
    }),
  ).toBeVisible();

  // Behavior: inspect the partner registration action before leaving the WonderHood site.
  const partnerRegistrationLink = page.getByRole("link", {
    name: /register on partner website/i,
  });

  // Assertion: the partner registration action points to the expected Dino Yoga partner website.
  await expect(partnerRegistrationLink).toBeVisible();
  await expect(partnerRegistrationLink).toHaveAttribute(
    "href",
    "https://www.westcusterlibrary.org/events/summer-reading-event-dino-yoga/",
  );

  // Behavior: open the partner registration website from the Dino Yoga event details.
  const [partnerPage] = await Promise.all([
    page.context().waitForEvent("page"),
    partnerRegistrationLink.click(),
  ]);

  // Assertion: the user is taken to the expected partner registration page.
  await expect(partnerPage).toHaveURL(
    "https://www.westcusterlibrary.org/events/summer-reading-event-dino-yoga/",
  );
  await partnerPage.waitForLoadState("domcontentloaded");
  await expect(partnerPage).toHaveTitle(/summer reading event: dino yoga/i);
  await expect(partnerPage.getByText(/summer reading event: dino yoga/i).first()).toBeVisible();
  await expect(partnerPage.getByText(/june 30,\s*2026/i)).toBeVisible();
  await expect(partnerPage.getByText(/join diana laughlin/i)).toBeVisible();
});
