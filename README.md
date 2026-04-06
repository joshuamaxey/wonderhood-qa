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
BASE_URL=https://your-wonderhood-site.org
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

This provides visibility into test results but does not block deployments.

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

---

## Notes

This repository is intentionally separate from the main Wonderhood application codebase to support independent QA workflows and black-box testing.
