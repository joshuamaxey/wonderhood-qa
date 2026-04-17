# Wonderhood QA (Playwright E2E Tests)

This repository contains end-to-end (E2E) tests for the Wonderhood website using Playwright.

The goal of this project is to provide automated test coverage for critical user flows and ensure the site remains stable and functional as changes are made.

---

## Overview

* Framework: Playwright
* Language: TypeScript
* Test Type: Black-box E2E testing (no backend access required)
* Target: Deployed Wonderhood website

---

## Project Structure

```
Flows/
├─ smoke/        # Critical, high-level checks (site is alive)
├─ regression/   # Deeper user flows and edge cases

playwright.config.ts
package.json
.env.example
```

---

## Getting Started

### 1. Install dependencies

```
npm install
```

### 2. Install Playwright browsers

```
npx playwright install
```

### 3. Set environment variables

Create a `.env` file based on `.env.example`:

```
BASE_URL=https://whproject.org/
```

---

## Running Tests

### Run all tests

```
npx playwright test
```

### Run tests in UI mode

```
npx playwright test --ui
```

### View test report

```
npx playwright show-report
```

---

## Test Types

### Smoke Tests

Located in `Flows/smoke/`

These are fast, high-level checks that verify the application is functioning at a basic level.

Examples:

* Homepage loads
* Navigation works
* Key UI elements are visible

---

### Regression Tests

Located in `Flows/regression/`

These cover full user flows and ensure that existing functionality continues to work after changes.

Examples:

* Form submissions
* Multi-step user journeys
* Previously fixed bugs

---

## Configuration

Base URL is configured in `playwright.config.ts`:

```
baseURL: process.env.BASE_URL
```

Tests use relative paths (e.g. `page.goto('/')`).

---

## CI (GitHub Actions)

Tests run automatically via GitHub Actions on:

* Push to main
* Pull requests
* Manual runs from the Actions tab

This provides visibility into test results but does not block deployments.

GitHub Actions reads `BASE_URL` from a repository secret named `BASE_URL`. Set that secret in the repository settings before relying on CI runs.

---

## Security Notes

* Do not commit `.env` files
* Do not include API keys, credentials, or sensitive data
* Use `.env.example` for reference only

---

## Goals

* Provide reliable smoke coverage for critical paths
* Build a maintainable regression suite over time
* Catch issues early through automated testing

---

## Contributing

* Keep tests stable and deterministic (avoid flaky patterns)
* Prefer user-visible assertions (what the user sees/does)
* Add new tests to the appropriate `Flows/` folder
* Use the C / B / A pattern by default: Configuration, Behavior, Assertion
* It is acceptable to add another `Behavior` and `Assertion` pair in the same test when it extends the same user flow and avoids repeating setup such as logging in again just to verify logout
* Prefer keeping assertions in dedicated `Assertion` blocks instead of mixing them into `Behavior` steps when the test can stay clear and readable

---

## Notes

This repository is intentionally separate from the main Wonderhood application codebase to support independent QA workflows and black-box testing.
