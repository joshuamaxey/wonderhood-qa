import { expect, test } from "@playwright/test";
import { dismissCookieBanner } from "../../../utils/helpers/auth";
import {
  DonationFlow,
  requireStripeTestPaymentConfiguration,
} from "./donation.flow";

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
    const donation = new DonationFlow(page);
    await donation.openForm();
    const paymentRequests: string[] = [];
    page.on("request", (request) => {
      if (request.method() === "POST" && /\/payments\/?$/.test(request.url())) {
        paymentRequests.push(request.url());
      }
    });

    // Behavior: enter an amount below the field's minimum and try to proceed.
    await donation.enterAmount("0");
    await donation.proceedButton.click();

    // Assertion: native form validation identifies the invalid amount before any payment request is sent.
    await expect.poll(
      () => donation.amountField.evaluate((input: HTMLInputElement) => input.validity.valid),
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

  test("visitor completes a Stripe test-mode donation and requests an acknowledgement", async ({ page }) => {
    // Cleanup requirement: after every completed payment run, capture its Stripe Checkout Session and event IDs, then manually remove the matching staging Donation, StripeEvent, and tax-acknowledgement records before considering the run complete.
    test.setTimeout(180_000);
    test.skip(
      process.env.STRIPE_TEST_PAYMENT_ENABLED !== "true",
      "Set STRIPE_TEST_PAYMENT_ENABLED=true only after the local Stripe test environment and cleanup plan are confirmed.",
    );

    // Configuration: open the local donation form after test-mode Stripe keys, webhook forwarding, and staging data cleanup are confirmed.
    const donationTestConfig = requireStripeTestPaymentConfiguration();
    const donation = new DonationFlow(page);
    await donation.openForm();
    await donation.enterAmount(donationTestConfig.donationAmount);

    // Behavior: create a test Checkout Session from the configured donation amount.
    const checkoutSessionResponse = await donation.proceedToCheckout();

    // Assertion: the application creates the test Checkout Session and shows Stripe Embedded Checkout in test mode.
    await expect(checkoutSessionResponse.status()).toBe(202);
    await expect(donation.checkout.getByText(/test mode/i)).toBeVisible();
    await expect(donation.checkout.getByText(/^donation$/i)).toBeVisible();

    // Behavior: complete Stripe Checkout with the approved test card, synthetic billing details, and required agent disclosures.
    await donation.fillStripePaymentDetails(donationTestConfig);
    await donation.submitStripePayment();

    // Assertion: a successful test payment reaches the protected tax-acknowledgement request.
    await expect(page).toHaveURL(/\/tax-return$/, { timeout: 120_000 });
    await expect(
      page.getByText(/i agree to receive a donation\/sponsorship acknowledgement/i),
    ).toBeVisible();
    await expect(page.getByText(/skip this step by clicking the.*next.*button/i)).toBeVisible();

    // Behavior: request an acknowledgement and submit synthetic donor credentials.
    await donation.requestAcknowledgement(donationTestConfig);

    // Assertion: the donor returns home and sees the expected payment-success thank-you modal.
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText(/thank you for your contribution/i)).toBeVisible();
    await expect(
      page.getByText(/payment was successful.*tax return was requested/i),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /^accept$/i })).toBeVisible();
  });
});
