# Regression Notes

Use this file to capture regression-test ideas discovered while building or maintaining smoke tests.

## How To Use This File

- Add a note when a smoke flow exposes deeper validation that should be covered separately.
- Keep entries short and focused on the user-visible behavior to validate.
- Prefer turning these notes into dedicated tests under `Flows/regression/` when they become actionable.

## Backlog

### Events Flow

- Verify each Events carousel control scrolls the visible event cards in the expected direction.
- Verify each Programs carousel control scrolls the visible program cards in the expected direction.
- Verify opening `View Details` from an event card shows the expected event detail content and a clear return path.
- Verify opening `View Details` from a program card shows the expected program detail content and a clear return path.
- Verify event and program detail pages preserve user-visible capacity, date, time, location, and organizer details.
- Verify enrolled children can be managed from the event detail page without changing unrelated child enrollments.
- Verify event enrollment capacity and spots remaining update correctly when multiple children or multiple accounts enroll.
- Consider separate program enrollment coverage if enrichment programs diverge from the current event enrollment flow.
- Cover admin `Notify Users` for enrolled event parents only after the test environment has a safe email sink or a guaranteed single test recipient.
- Add deeper event edit coverage for image updates, registration method changes, label changes, and school-access eligibility rules.

### Add Child Flow

- Verify the confirmation page `Download PDF copy` action downloads a waiver PDF successfully.
- Verify the downloaded waiver PDF has the expected file type and is not empty.
- Verify the downloaded waiver PDF content matches the completed waiver flow, including the child and parent signature details that should appear in the final document.
- Verify a newly created child appears in the profile child list without requiring a manual page refresh.
- Verify child deletion shows the expected confirmation modal content, including the correct child name.
- Verify canceling child deletion leaves the child visible and unchanged.
- Verify confirming child deletion removes the child from the profile list and prevents stale child details from remaining visible after refresh.
- Verify a parent can add another child successfully when the account already has existing children.

### Donation Flow

- Pre-event coverage for no-acknowledgement success, declined-card recovery, amount validation, recoverable Checkout Session failure, and mobile success is implemented in `Flows/regression/donations/donation-pre-event.spec.ts`.
- Verify incomplete Stripe card details prevent submission and identify the fields that need attention.
- Verify canceling or abandoning checkout does not show a successful donation state.
- Verify repeated activation while Checkout Session creation is pending cannot create duplicate sessions; the Proceed button currently remains enabled with unchanged text during a delayed request.
- Verify a Stripe processing stall after Pay is distinct from a recoverable `POST /payments` failure and never produces a false success state.
- Verify empty, zero, negative, and malformed donation amounts cannot create a Checkout Session.
- Confirm and implement user-visible validation for empty and malformed donation amounts; both currently submit `POST /payments`, receive `422`, and leave the donor without recovery guidance.
- Decide whether decimal donations are supported; the browser currently accepts them, while the integer backend contract returns `422` without user-visible guidance.
- No upper donation limit is currently intended; keep routine payment tests small and treat very-large values as separate boundary coverage.
- Verify duplicate webhook delivery does not create a duplicate donation or duplicate user-visible acknowledgement.
- Verify additional acknowledgement-field validation and correction paths beyond the completed accept/decline journeys.
- Verify the protected cleanup endpoint returns `nothing_to_clean` for an unpaid Checkout Session; it currently raises an internal error while trying to access an unavailable `dinnerpayment` Prisma client attribute.
