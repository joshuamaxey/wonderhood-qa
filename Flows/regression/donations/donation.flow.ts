import { expect, type FrameLocator, type Page, type Response } from "@playwright/test";
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
      await this.checkout
        .getByText(/save my information for faster checkout/i)
        .click();
    }

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
