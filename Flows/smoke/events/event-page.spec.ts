import { expect, test } from "@playwright/test";
import { dismissCookieBanner } from "../../../utils/helpers/auth";

test("first event detail page displays Smokey Bear event content", async ({ page }) => {
  // Configuration: navigate to the public Events page and open the first Smokey Bear event details.
  await page.goto("/events");
  await expect(page.getByText(/upcoming events/i)).toBeVisible();
  await dismissCookieBanner(page);
  const smokeyBearEventCard = page.locator("article").filter({
    hasText: /meet smokey bear: fire safety day/i,
  });
  await expect(smokeyBearEventCard).toHaveCount(1);

  // Behavior: open the event detail page from the Smokey Bear event card.
  await smokeyBearEventCard.getByText(/^view details$/i).click();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /meet smokey bear: fire safety day in westcliffe/i,
    }),
  ).toBeVisible();

  // Assertion: the event detail page shows the expected Smokey Bear event overview and description.
  await expect(page).toHaveURL(/\/events\/[a-f0-9]+$/);
  await expect(page.getByRole("link", { name: /back to events/i })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: /about this event/i })).toBeVisible();
  await expect(
    page.getByText(/join west custer county library and the wet mountain fire protection district/i),
  ).toBeVisible();
  await expect(page.getByText(/meet smokey bear/i).first()).toBeVisible();
  await expect(page.getByText(/learn about fire prevention and wildfire safety/i)).toBeVisible();

  // Assertion: the event detail page shows the expected notes, calendar, location, and enrollment details.
  await expect(page.getByRole("heading", { level: 3, name: /notes & what to bring/i })).toBeVisible();
  await expect(page.getByRole("heading", { level: 4, name: /important/i })).toBeVisible();
  await expect(page.getByText(/free public event/i)).toBeVisible();
  await expect(page.getByText(/children should attend with an adult/i)).toBeVisible();
  await expect(page.getByText(/outdoor event/i)).toBeVisible();
  await expect(page.getByText(/mindy@westcusterlibrary\.org/i)).toBeVisible();
  await expect(page.getByText(/partner event/i)).toBeVisible();
  await expect(page.getByText(/participants/i)).toBeVisible();
  await expect(page.getByText(/max 20/i)).toBeVisible();
  await expect(page.getByText(/event date & time/i)).toBeVisible();
  await expect(page.getByText(/10:00 am\s*–\s*12:00 pm/i).first()).toBeVisible();
  await expect(page.getByText(/jul\s*1\s*2027/i)).toBeVisible();
  await expect(page.getByText(/full address/i)).toBeVisible();
  await expect(page.getByText(/hermit park \/ westcliffe/i)).toBeVisible();
  await expect(page.getByText(/westcliffe, co 81252/i)).toBeVisible();
  await expect(page.getByText(/who can enroll/i)).toBeVisible();
  await expect(page.getByText(/all children/i)).toBeVisible();

  // Assertion: the third-party event warning and partner registration action are visible.
  await expect(page.getByText(/third-party event/i)).toBeVisible();
  await expect(page.getByText(/organized by an independent partner/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /spots available/i })).toBeDisabled();
  await expect(page.getByRole("link", { name: /register on partner website/i })).toHaveAttribute(
    "href",
    "https://www.westcusterlibrary.org/events/summer-reading-event-smokey-bear-fire-prevention/",
  );
});
