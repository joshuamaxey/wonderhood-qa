import {
  expect,
  type APIRequestContext,
  type FrameLocator,
  type Page,
  type Response,
} from "@playwright/test";
import { dismissCookieBanner } from "../../../utils/helpers/auth";

export type DonationTestConfiguration = {
  donationAmount: number;
  donationEmail: string;
};

export function requireStripeTestPaymentConfiguration(): DonationTestConfiguration {
  const baseURL = process.env.BASE_URL;
  const paymentEnabled = process.env.STRIPE_TEST_PAYMENT_ENABLED === "true";
  const donationAmount = Number(process.env.DONATION_TEST_AMOUNT);
  const donationEmail = process.env.DONATION_TEST_EMAIL;

  expect(
    paymentEnabled,
    "STRIPE_TEST_PAYMENT_ENABLED must be true for the completed-payment flow.",
  ).toBe(true);
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

export async function cleanupDonationSession(
  request: APIRequestContext,
  sessionId: string,
) {
  const apiURL = process.env.DONATION_TEST_API_URL ?? "http://127.0.0.1:8000";
  const apiHost = new URL(apiURL).hostname;
  expect(
    ["localhost", "127.0.0.1"].includes(apiHost),
    `Donation cleanup is restricted to a local API target, not ${apiHost}.`,
  ).toBe(true);

  const adminEmail = process.env.DONATION_CLEANUP_ADMIN_EMAIL || process.env.EVENT_EDIT_ADMIN_EMAIL;
  const adminPassword =
    process.env.DONATION_CLEANUP_ADMIN_PASSWORD ||
    process.env.EVENT_EDIT_ADMIN_PASSWORD ||
    process.env.DEFAULT_PASS;
  expect(adminEmail, "A staging admin email is required for donation cleanup.").toBeTruthy();
  expect(adminPassword, "A staging admin password is required for donation cleanup.").toBeTruthy();

  const loginResponse = await request.post(`${apiURL}/auth/token`, {
    form: { username: adminEmail!, password: adminPassword! },
  });
  expect(loginResponse.status(), "Donation cleanup admin authentication should succeed.").toBe(200);
  const { access_token: accessToken } = await loginResponse.json();

  const cleanupResponse = await request.delete(`${apiURL}/payments/cleanup/${sessionId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect(cleanupResponse.status(), `Cleanup should succeed for ${sessionId}.`).toBe(200);
  const cleanupResult = await cleanupResponse.json();
  expect(cleanupResult.status, `Cleanup should remove records for ${sessionId}.`).toBe("cleaned");
  expect(
    cleanupResult.removed.map((record: { type: string }) => record.type),
    `Cleanup should remove the Donation for ${sessionId}.`,
  ).toContain("Donations");
  return cleanupResult;
}

export async function checkoutSessionIdFromResponse(response: Response): Promise<string> {
  const body = await response.json();
  const clientSecret = body["client-secret"];
  expect(clientSecret, "Checkout Session creation should return a client secret.").toBeTruthy();
  const sessionId = String(clientSecret).match(/^(cs_test_.+?)_secret_/)?.[1];
  expect(sessionId, "The client secret should identify a Stripe test Checkout Session.").toMatch(
    /^cs_test_/,
  );
  return sessionId!;
}

export class DonationFlow {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  get amountField() {
    return this.page.getByLabel(/donation amount/i);
  }

  get proceedButton() {
    return this.page.getByRole("button", { name: /proceed with donation/i });
  }

  get checkout(): FrameLocator {
    return this.page.frameLocator('iframe[title="Embedded checkout"]');
  }

  get acknowledgementCheckbox() {
    return this.page.getByRole("checkbox").first();
  }

  async openForm() {
    await this.page.goto("/donate");
    await dismissCookieBanner(this.page);
  }

  async enterAmount(amount: string | number) {
    await this.amountField.fill(String(amount));
  }

  async proceedToCheckout(): Promise<Response> {
    const checkoutSessionResponse = this.page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        /\/payments\/?$/.test(response.url()),
    );

    await this.proceedButton.click();
    return checkoutSessionResponse;
  }

  async fillStripePaymentDetails(
    configuration: DonationTestConfiguration,
    cardNumber = "4242424242424242",
  ) {
    await this.checkout
      .getByPlaceholder("email@example.com")
      .fill(configuration.donationEmail);
    await this.checkout.getByRole("radio").first().check({ force: true });
    await this.checkout
      .getByRole("textbox", { name: /card number/i })
      .fill(cardNumber);
    await this.checkout.getByRole("textbox", { name: /expiration/i }).fill("1230");
    await this.checkout.getByRole("textbox", { name: /^cvc$/i }).fill("123");
    await this.checkout.getByLabel(/cardholder name/i).fill("Wonderhood QA");
    await this.checkout.getByRole("textbox", { name: /zip/i }).fill("60601");

    const saveWithLink = this.checkout.locator('input[name="enableStripePass"]');
    if (await saveWithLink.isChecked()) {
      await saveWithLink.evaluate((checkbox: HTMLInputElement) => checkbox.click());
    }
    await expect(saveWithLink).not.toBeChecked();

    const actingForUserDisclosure = this.checkout.getByRole("checkbox", {
      name: /ai agent acting on/i,
    });
    await actingForUserDisclosure.evaluate((checkbox: HTMLInputElement) => checkbox.click());
    await expect(actingForUserDisclosure).toBeChecked();

    const followedInstructionsDisclosure = this.checkout.getByRole("checkbox", {
      name: /ai agent and have/i,
    });
    await followedInstructionsDisclosure.waitFor({ state: "attached" });
    await followedInstructionsDisclosure.evaluate((checkbox: HTMLInputElement) => checkbox.click());
    await expect(followedInstructionsDisclosure).toBeChecked();
  }

  async submitStripePayment() {
    const payButton = this.checkout.getByRole("button", { name: /^pay$/i });
    await expect.poll(
      () => payButton.getAttribute("class"),
      { message: "Stripe Checkout should be complete before Pay is pressed." },
    ).not.toContain("SubmitButton--incomplete");
    await payButton.click();
  }

  async submitSuccessfulStripePayment() {
    const verificationRequest = this.page.waitForRequest(
      (request) => /\/payments\/verify\?session_id=cs_test_/.test(request.url()),
      { timeout: 60_000 },
    );
    await this.submitStripePayment();
    const verificationURL = new URL((await verificationRequest).url());
    const verifiedSessionId = verificationURL.searchParams.get("session_id");
    expect(verifiedSessionId, "The successful payment redirect should identify its Checkout Session.").toMatch(
      /^cs_test_/,
    );
  }

  async requestAcknowledgement(configuration: DonationTestConfiguration) {
    await this.acknowledgementCheckbox.check();
    await this.page.getByPlaceholder("First Name").fill("Wonderhood");
    await this.page.getByPlaceholder("Last Name").fill("QA");
    await this.page
      .getByPlaceholder("example@example.com")
      .fill(configuration.donationEmail);
    await this.page.getByPlaceholder("Street Address").fill("123 Test Street");
    await this.page.getByPlaceholder("City").fill("Chicago");
    await this.page.getByPlaceholder("State").fill("IL");
    await this.page.getByPlaceholder("Zip Code").fill("60601");
    await this.page.getByRole("button", { name: /^next$/i }).click();
  }

  async skipAcknowledgement() {
    await this.page.getByRole("link", { name: /^next$/i }).click();
  }
}
