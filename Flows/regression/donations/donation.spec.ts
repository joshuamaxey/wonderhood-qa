import { expect, test } from "@playwright/test";
import { dismissCookieBanner } from "../../../utils/helpers/auth";

function requireStripeTestPaymentConfiguration() {
  const baseURL = process.env.BASE_URL;
  const paymentEnabled = process.env.STRIPE_TEST_PAYMENT_ENABLED === "true";
  const donationAmount = Number(process.env.DONATION_TEST_AMOUNT);
  const donationEmail = process.env.DONATION_TEST_EMAIL;

  expect(paymentEnabled, "STRIPE_TEST_PAYMENT_ENABLED must be true for the completed-payment flow.").toBe(true);
  expect(baseURL, "BASE_URL must be set for the completed-payment flow.").toBeTruthy();

  const targetHost = new URL(baseURL!).hostname;
  expect(
    ["localhost", "127.0.0.1"].includes(targetHost),
    `Completed Stripe test payments are restricted to a local target, not ${targetHost}.`,
  ).toBe(true);
  expect(
    Number.isInteger(donationAmount) && donationAmount >= 1,
    "DONATION_TEST_AMOUNT must be a positive whole-dollar amount.",
  ).toBe(true);
  expect(donationEmail, "DONATION_TEST_EMAIL must identify the approved test inbox.").toMatch(
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/,
  );

  return { donationAmount, donationEmail: donationEmail! };
}

test.describe("donation regression flow", () => {
  test("visitor opens the donation panel and reaches the donation form", async ({ page }) => {
    // Configuration: open the public homepage and dismiss the cookie banner before using the donation entry point.
    await page.goto("/");
    await dismissCookieBanner(page);

    // Behavior: open the donation panel from its accessible trigger.
    const donationPanelButton = page.getByRole("button", { name: /show donation panel/i });
    await donationPanelButton.click();

    // Assertion: the open panel presents a Donate link and an accessible way to close it.
    const donateLink = page.getByRole("link", { name: /^donate$/i });
    await expect(donateLink).toHaveAttribute("href", "/donate");
    await expect(page.getByRole("button", { name: /hide donation panel/i })).toBeVisible();

    // Behavior: close and reopen the panel before following its Donate link.
    await page.getByRole("button", { name: /hide donation panel/i }).click();
    await page.getByRole("button", { name: /show donation panel/i }).click();
    await donateLink.click();

    // Assertion: the visitor reaches the donation form with its primary user-visible controls available.
    await expect(page).toHaveURL(/\/donate$/);
    await expect(page.getByRole("heading", { name: /make a donation/i })).toBeVisible();
    await expect(page.getByLabel(/donation amount/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /proceed with donation/i })).toBeVisible();
  });

  test("donation form prevents an amount below the displayed minimum", async ({ page }) => {
    // Configuration: open the donation form and track whether the browser sends a payment request.
    await page.goto("/donate");
    await dismissCookieBanner(page);
    const paymentRequests: string[] = [];
    page.on("request", (request) => {
      if (request.method() === "POST" && /\/payments\/?$/.test(request.url())) {
        paymentRequests.push(request.url());
      }
    });

    // Behavior: enter an amount below the field's minimum and try to proceed.
    const donationAmount = page.getByLabel(/donation amount/i);
    await donationAmount.fill("0");
    await page.getByRole("button", { name: /proceed with donation/i }).click();

    // Assertion: native form validation identifies the invalid amount before any payment request is sent.
    await expect.poll(
      () => donationAmount.evaluate((input: HTMLInputElement) => input.validity.valid),
    ).toBe(false);
    await expect.poll(() => paymentRequests).toHaveLength(0);
    await expect(page).toHaveURL(/\/donate$/);
  });

  test("visitor cannot open tax acknowledgement before a successful donation", async ({ page }) => {
    // Configuration: start without a completed-payment cookie.
    await page.context().clearCookies();

    // Behavior: attempt to navigate directly to the protected tax-acknowledgement page.
    await page.goto("/tax-return");

    // Assertion: the visitor is returned to the homepage instead of seeing the protected form.
    await expect(page).toHaveURL(/\/?$/);
    await expect(page.getByRole("link", { name: /wonderhood/i }).first()).toBeVisible();
  });

  test.skip("visitor completes a Stripe test-mode donation", async ({ page }) => {
    // Configuration: open the local donation form after test-mode Stripe keys, webhook forwarding, and staging data cleanup are confirmed.
    const donationTestConfig = requireStripeTestPaymentConfiguration();
    await page.goto("/donate");
    await dismissCookieBanner(page);
    await page.getByLabel(/donation amount/i).fill(String(donationTestConfig.donationAmount));

    // Behavior: enter the configured test donation details and complete Stripe Embedded Checkout with an approved test card.
    void donationTestConfig.donationEmail;
    // TODO: implement after the test-mode checkout fields and intended post-payment journey can be inspected safely.

    // Assertion: verify the intended success redirect, confirmation, and webhook-dependent user-visible outcome.
    // TODO: implement after the Wonderhood team confirms the expected success and tax-acknowledgement behavior.
  });
});
