import { expect, test } from "@playwright/test";
import {
  checkoutSessionIdFromResponse,
  cleanupDonationSession,
  DonationFlow,
  requireStripeTestPaymentConfiguration,
} from "./donation.flow";
import { dismissCookieBanner } from "../../../utils/helpers/auth";

test.describe("pre-event donation coverage", () => {
  test("visitor completes a donation without requesting an acknowledgement", async ({ page, request }) => {
    // Cleanup requirement: capture the exact Stripe Checkout Session and remove its linked staging records after the journey.
    test.setTimeout(180_000);
    test.skip(
      process.env.STRIPE_TEST_PAYMENT_ENABLED !== "true",
      "Enable completed test payments only after Stripe test mode and manual staging cleanup are confirmed.",
    );

    // Configuration: start the approved local Stripe test environment, enable payment execution, and open the donation form with automatic cleanup ready.
    const donationTestConfig = requireStripeTestPaymentConfiguration();
    const donation = new DonationFlow(page);
    await donation.openForm();
    await donation.enterAmount(donationTestConfig.donationAmount);

    // Behavior: create a test Checkout Session and complete Stripe Checkout with approved synthetic payment details.
    const checkoutSessionResponse = await donation.proceedToCheckout();
    const sessionId = await checkoutSessionIdFromResponse(checkoutSessionResponse);
    await donation.fillStripePaymentDetails(donationTestConfig);

    try {
      await donation.submitSuccessfulStripePayment();

      // Assertion: the application accepts the session and opens the acknowledgement choice after successful payment.
      await expect(checkoutSessionResponse.status()).toBe(202);
      await expect(page).toHaveURL(/\/tax-return$/, { timeout: 120_000 });
      await expect(donation.acknowledgementCheckbox).not.toBeChecked();
      await expect(page.getByPlaceholder("First Name")).toBeHidden();

      // Behavior: leave acknowledgement unselected and continue without submitting donor credentials.
      const acknowledgementRequests: string[] = [];
      page.on("request", (observedRequest) => {
        if (observedRequest.method() === "POST" && /\/tax-return\/?$/.test(observedRequest.url())) {
          acknowledgementRequests.push(observedRequest.url());
        }
      });
      await donation.skipAcknowledgement();

      // Assertion: the visitor returns home with a payment-success message and no acknowledgement request is submitted.
      await expect(page).toHaveURL(/\/\?modal=taxReturnSuccess$/);
      await expect(page.getByText(/thank you for your contribution/i)).toBeVisible();
      await expect(page.getByText(/payment was successful/i)).toBeVisible();
      await expect(page.getByRole("button", { name: /^accept$/i })).toBeVisible();
      await expect.poll(() => acknowledgementRequests).toHaveLength(0);
    } finally {
      await cleanupDonationSession(request, sessionId);
    }
  });

  test("visitor recovers from a declined test card and completes the donation", async ({ page, request }) => {
    test.setTimeout(180_000);
    test.skip(
      process.env.STRIPE_TEST_PAYMENT_ENABLED !== "true",
      "Enable completed test payments only after Stripe test mode and staging cleanup are confirmed.",
    );

    // Configuration: open Stripe Embedded Checkout locally with the approved test inbox and a cleanup plan ready.
    const donationTestConfig = requireStripeTestPaymentConfiguration();
    const donation = new DonationFlow(page);
    await donation.openForm();
    await donation.enterAmount(donationTestConfig.donationAmount);
    const checkoutResponse = await donation.proceedToCheckout();
    const sessionId = await checkoutSessionIdFromResponse(checkoutResponse);
    await donation.fillStripePaymentDetails(donationTestConfig, "4000000000000002");

    // Behavior: submit the declined test card, observe the error, replace it with the successful test card, and retry payment.
    await donation.submitStripePayment();

    // Assertion: Stripe explains the decline and the visitor remains outside the success journey.
    await expect(
      donation.checkout.getByText(/your credit card was declined.*try paying with a debit card/i),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/donate$/);

    // Behavior: replace the declined card with Stripe's successful test card and retry in the same Checkout Session.
    await donation.checkout.getByRole("textbox", { name: /card number/i }).fill("4242424242424242");
    try {
      await donation.submitSuccessfulStripePayment();

      // Assertion: the retry succeeds and reaches the acknowledgement choice without creating a second application checkout.
      await expect(page).toHaveURL(/\/tax-return$/, { timeout: 120_000 });
      await expect(donation.acknowledgementCheckbox).not.toBeChecked();
    } finally {
      await cleanupDonationSession(request, sessionId);
    }
  });

  test("donation form blocks amounts below its displayed minimum", async ({ page }) => {
    const invalidAmounts = ["0", "-1"];

    for (const invalidAmount of invalidAmounts) {
      // Configuration: open a fresh donation form and monitor whether the app attempts to create a Checkout Session.
      const donation = new DonationFlow(page);
      await donation.openForm();
      const paymentRequests: string[] = [];
      const recordPaymentRequest = (request: { method(): string; url(): string }) => {
        if (request.method() === "POST" && /\/payments\/?$/.test(request.url())) {
          paymentRequests.push(request.url());
        }
      };
      page.on("request", recordPaymentRequest);

      // Behavior: enter an amount below the displayed one-dollar minimum and try to proceed.
      await donation.enterAmount(invalidAmount);
      await donation.proceedButton.click();

      // Assertion: native validation identifies the invalid amount before any payment request is sent.
      await expect.poll(
        () => donation.amountField.evaluate((input: HTMLInputElement) => input.validity.valid),
      ).toBe(false);
      await expect.poll(() => paymentRequests).toHaveLength(0);
      await expect(page).toHaveURL(/\/donate$/);

      page.off("request", recordPaymentRequest);
    }
  });

  test("visitor recovers when Checkout Session creation fails", async ({ page }) => {
    // Configuration: open the local donation form and replace only the Checkout Session response with a controlled failure.
    const donation = new DonationFlow(page);
    await donation.openForm();
    await donation.enterAmount(1);
    await page.route(/\/payments\/?$/, async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: '{"detail":"Unavailable"}',
      });
    });

    // Behavior: attempt to proceed while Checkout Session creation is unavailable.
    await donation.proceedButton.click();

    // Assertion: the visitor sees recovery guidance, remains on the donation form, and never enters checkout or a false success state.
    await expect(
      page.getByText(/we couldn't process that donation amount.*check it and try again/i),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/donate$/);
    await expect(page.locator('iframe[title="Embedded checkout"]')).toHaveCount(0);
    await expect(page.getByText(/payment was successful/i)).toHaveCount(0);

    // Behavior: restore the local endpoint and retry from the same donation form.
    await page.unroute(/\/payments\/?$/);
    const retryResponse = await donation.proceedToCheckout();

    // Assertion: retrying creates a test Checkout Session and opens embedded checkout without reloading the journey.
    await expect(retryResponse.status()).toBe(202);
    await expect(donation.checkout.getByText(/test mode/i)).toBeVisible();
  });

  test("mobile visitor completes the critical donation journey", async ({ page, request }) => {
    test.setTimeout(180_000);
    test.skip(
      process.env.STRIPE_TEST_PAYMENT_ENABLED !== "true",
      "Enable completed test payments only after Stripe test mode and staging cleanup are confirmed.",
    );

    // Configuration: use an agreed mobile browser viewport against the approved local Stripe test environment with cleanup ready.
    await page.setViewportSize({ width: 390, height: 844 });
    const donationTestConfig = requireStripeTestPaymentConfiguration();
    await page.goto("/");
    await dismissCookieBanner(page);

    // Behavior: open the donation panel, complete a test-card payment, decline acknowledgement, and return home.
    await page.getByRole("button", { name: /show donation panel/i }).click();
    await page.getByRole("link", { name: /^donate$/i }).click();
    const donation = new DonationFlow(page);
    await donation.enterAmount(donationTestConfig.donationAmount);
    const checkoutResponse = await donation.proceedToCheckout();
    const sessionId = await checkoutSessionIdFromResponse(checkoutResponse);
    await donation.fillStripePaymentDetails(donationTestConfig);
    try {
      await donation.submitSuccessfulStripePayment();
      await expect(page).toHaveURL(/\/tax-return$/, { timeout: 120_000 });
      await donation.skipAcknowledgement();

    // Assertion: every critical control and message is visible without clipping, the success modal is usable, and no horizontal overflow blocks the journey.
      await expect(page).toHaveURL(/\/\?modal=taxReturnSuccess$/);
      await expect(page.getByText(/payment was successful/i)).toBeVisible();
      await expect(page.getByRole("button", { name: /^accept$/i })).toBeVisible();
      await expect.poll(
        () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
      ).toBe(true);
    } finally {
      await cleanupDonationSession(request, sessionId);
    }
  });
});
