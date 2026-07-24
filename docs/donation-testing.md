# Donation Regression Testing

The completed donation regression must run only against a local Wonderhood frontend and backend configured for Stripe test mode and the approved staging database. Never submit Stripe test-card details to the deployed production donation form.

## Wonderhood Application Configuration

Configure these values in the separate Wonderhood application repository. Do not copy Stripe keys into this QA repository.

`backend/.env.staging`:

```dotenv
DATABASE_URL=<wundr-staging connection with the /WonderHood database path>
DATABASE_NAME=WonderHood
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
STRIPE_SECRET_KEY=<Stripe test-mode secret key>
STRIPE_WEBHOOK_SECRET=<temporary secret printed by stripe listen>
```

`frontend/.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<Stripe test-mode publishable key>
```

Before starting either application, verify that:

- The application repository is on the intended current `main` revision.
- `DATABASE_URL` targets the `wundr-staging` cluster and `/WonderHood` database.
- `DATABASE_NAME` is exactly `WonderHood`.
- Neither database setting targets the separate `WUNDR-staging` database.
- The Stripe keys are explicitly confirmed as test-mode credentials.
- `BACKEND_URL=http://localhost:8000` makes Stripe return through the local `/payments/verify` endpoint.
- `FRONTEND_URL=http://localhost:3000` returns the verified donor to the local frontend.

## Stripe CLI

Authenticate the CLI with an authorized Wonderhood Stripe test account:

```bash
stripe login
```

Start webhook forwarding and keep it running during the test:

```bash
stripe listen --forward-to localhost:8000/payments/webhook
```

Copy the temporary `whsec_...` value printed by the listener into `STRIPE_WEBHOOK_SECRET` in `backend/.env.staging`. Do not commit it.

## QA Repository Configuration

Configure these non-secret flow controls in this repository's ignored `.env` file:

```dotenv
BASE_URL=http://localhost:3000
STRIPE_TEST_PAYMENT_ENABLED=false
DONATION_TEST_AMOUNT=1
DONATION_TEST_EMAIL=<approved test inbox>
```

Keep `STRIPE_TEST_PAYMENT_ENABLED=false` until all readiness checks below pass and the skipped completed-payment scenario has been implemented from a safe test-mode browser inspection.

## Readiness Checks

Before enabling or completing the payment scenario:

- Confirm the backend starts with `APP_ENV=staging`.
- Confirm `GET http://127.0.0.1:8000/health` returns 200.
- Confirm `http://localhost:3000/donate` loads.
- Confirm Stripe Embedded Checkout is using a test-mode publishable key.
- Confirm webhook forwarding reaches `localhost:8000/payments/webhook`.
- Confirm the local browser accepts the `tax_return_allowed` cookie after payment; it is currently marked `secure`, while the documented local frontend uses HTTP.
- Confirm the expected post-payment redirect and tax-acknowledgement behavior with the Wonderhood team.
- Confirm the tax-acknowledgement form associates its submission with the donation from the current Stripe session rather than another recent Stripe event.
- Confirm a safe cleanup policy for donation, Stripe-event, and tax-acknowledgement records.

Use Stripe's successful test card only after those checks pass:

- Card number: `4242 4242 4242 4242`
- Expiration: any future date
- CVC: `123`
- Email: the approved test inbox configured as `DONATION_TEST_EMAIL`

## Running the Flow

Run Playwright outside the sandbox:

```bash
npx playwright test Flows/regression/donations/donation.spec.ts
```

The executable scenarios cover the donation panel, navigation to the donation form, native minimum-amount validation, and protection of the tax-acknowledgement page before payment. The completed-payment scenario remains explicitly skipped until test-mode checkout and the intended success journey can be inspected safely.
