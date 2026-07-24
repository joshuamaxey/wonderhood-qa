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

  test("visitor completes a Stripe test-mode donation and requests an acknowledgement", async ({ page }) => {
    // Cleanup requirement: after every completed payment run, capture its Stripe Checkout Session and event IDs, then manually remove the matching staging Donation, StripeEvent, and tax-acknowledgement records before considering the run complete.
    test.setTimeout(180_000);
    test.skip(
      process.env.STRIPE_TEST_PAYMENT_ENABLED !== "true",
      "Set STRIPE_TEST_PAYMENT_ENABLED=true only after the local Stripe test environment and cleanup plan are confirmed.",
    );

    // Configuration: open the local donation form after test-mode Stripe keys, webhook forwarding, and staging data cleanup are confirmed.
    const donationTestConfig = requireStripeTestPaymentConfiguration();
    await page.goto("/donate");
    await dismissCookieBanner(page);
    await page.getByLabel(/donation amount/i).fill(String(donationTestConfig.donationAmount));

    // Behavior: create a test Checkout Session from the configured donation amount.
    const checkoutSessionResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        /\/payments\/?$/.test(response.url()),
    );
    await page.getByRole("button", { name: /proceed with donation/i }).click();

    // Assertion: the application creates the test Checkout Session and shows Stripe Embedded Checkout in test mode.
    await expect((await checkoutSessionResponse).status()).toBe(202);
    const checkout = page.frameLocator('iframe[title="Embedded checkout"]');
    await expect(checkout.getByText(/test mode/i)).toBeVisible();
    await expect(checkout.getByText(/^donation$/i)).toBeVisible();

    // Behavior: complete Stripe Checkout with the approved test card, synthetic billing details, and required agent disclosures.
    await checkout.getByPlaceholder("email@example.com").fill(donationTestConfig.donationEmail);
    await checkout.getByRole("radio").first().check({ force: true });
    await checkout.getByRole("textbox", { name: /card number/i }).fill("4242424242424242");
    await checkout.getByRole("textbox", { name: /expiration/i }).fill("1230");
    await checkout.getByRole("textbox", { name: /^cvc$/i }).fill("123");
    await checkout.getByLabel(/cardholder name/i).fill("Wonderhood QA");
    await checkout.getByRole("textbox", { name: /zip/i }).fill("60601");

    const saveWithLink = checkout.locator('input[name="enableStripePass"]');
    if (await saveWithLink.isChecked()) {
      await checkout.getByText(/save my information for faster checkout/i).click();
    }

    const actingForUserDisclosure = checkout.getByRole("checkbox", {
      name: /ai agent acting on/i,
    });
    await actingForUserDisclosure.evaluate((checkbox: HTMLInputElement) => checkbox.click());
    await expect(actingForUserDisclosure).toBeChecked();

    const followedInstructionsDisclosure = checkout.getByRole("checkbox", {
      name: /ai agent and have/i,
    });
    await followedInstructionsDisclosure.waitFor({ state: "attached" });
    await followedInstructionsDisclosure.evaluate((checkbox: HTMLInputElement) => checkbox.click());
    await expect(followedInstructionsDisclosure).toBeChecked();
    const payButton = checkout.getByRole("button", { name: /^pay$/i });
    await expect.poll(
      () => payButton.getAttribute("class"),
      { message: "Stripe Checkout should be complete before Pay is pressed." },
    ).not.toContain("SubmitButton--incomplete");
    await payButton.click();

    // Assertion: a successful test payment reaches the protected tax-acknowledgement request.
    await expect(page).toHaveURL(/\/tax-return$/, { timeout: 120_000 });
    await expect(
      page.getByText(/i agree to receive a donation\/sponsorship acknowledgement/i),
    ).toBeVisible();
    await expect(page.getByText(/skip this step by clicking the.*next.*button/i)).toBeVisible();

    // Behavior: request an acknowledgement and submit synthetic donor credentials.
    await page.getByRole("checkbox").first().check();
    await page.getByPlaceholder("First Name").fill("Wonderhood");
    await page.getByPlaceholder("Last Name").fill("QA");
    await page.getByPlaceholder("example@example.com").fill(donationTestConfig.donationEmail);
    await page.getByPlaceholder("Street Address").fill("123 Test Street");
    await page.getByPlaceholder("City").fill("Chicago");
    await page.getByPlaceholder("State").fill("IL");
    await page.getByPlaceholder("Zip Code").fill("60601");
    await page.getByRole("button", { name: /^next$/i }).click();

    // Assertion: the donor returns home and sees the expected payment-success thank-you modal.
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText(/thank you for your contribution/i)).toBeVisible();
    await expect(
      page.getByText(/payment was successful.*tax return was requested/i),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /^accept$/i })).toBeVisible();
  });
});
