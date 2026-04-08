# Wonderhood QA Repository

This repository contains Playwright end-to-end tests for the Wonderhood website.

## Purpose

- This is a standalone QA automation repository.
- It is separate from the main Wonderhood application codebase.
- Tests are black-box E2E tests against the deployed site.
- Do not assume backend access, database access, or internal application code access.

## Tech Stack

- Framework: Playwright Test
- Language: TypeScript
- Package manager: npm
- Environment config: dotenv
- Base URL comes from `.env` via `BASE_URL`

## Repo Conventions

### Test Location
- All tests live under `Flows/`
- Smoke tests live under `Flows/smoke/`
- Regression tests live under `Flows/regression/`

### Test Philosophy
- Prefer stable, user-visible assertions
- Test behavior the user can observe
- Avoid brittle selectors when possible
- Prefer accessible locators such as `getByRole`, `getByLabel`, and `getByText` when appropriate
- Keep smoke tests fast and high-signal
- Keep regression tests focused on real user flows

### Environment and Safety
- Never commit secrets, credentials, or `.env`
- Use `.env.example` for documented variables
- Do not hardcode production credentials or sensitive data
- Do not add backend-only assumptions to tests

### Browser Coverage
- Default browser project is Chromium unless explicitly asked to expand coverage

### Config Notes
- `playwright.config.ts` uses `BASE_URL` from `.env`
- Test directory is `./Flows`
- Use relative navigation like `page.goto('/')`

### Test Structure

- Follow the C / B / A pattern in every test:
  1. Configuration: navigate to the page and set up any preconditions
  2. Behavior: perform the user action or behavior under test
  3. Assertion: verify the result is what we expect

- Add a comment for every block:
  - Comment the purpose of the setup step
  - Comment the user action being executed
  - Comment the expected outcome being asserted

- Keep comments focused on intent, not implementation details.

## Common Patterns

- Use data-testid only if accessible selectors are not viable
- Prefer getByRole over getByText when possible
- Reuse helper functions from utils/ when available

## When Making Changes

Before proposing a final change set:

1. Explain the planned change briefly
2. Make the smallest reasonable change
3. Keep naming and folder structure consistent
4. Run the relevant validation commands
5. Summarize what changed and any follow-up recommendations

## Required Commands

Run these when relevant before proposing a final change set:

```bash
npm install
npx playwright test
npx playwright test --ui
npx playwright show-report