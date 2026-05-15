# Regression Notes

Use this file to capture regression-test ideas discovered while building or maintaining smoke tests.

## How To Use This File

- Add a note when a smoke flow exposes deeper validation that should be covered separately.
- Keep entries short and focused on the user-visible behavior to validate.
- Prefer turning these notes into dedicated tests under `Flows/regression/` when they become actionable.

## Backlog

### Add Child Flow

- Verify the confirmation page `Download PDF copy` action downloads a waiver PDF successfully.
- Verify the downloaded waiver PDF has the expected file type and is not empty.
- Verify the downloaded waiver PDF content matches the completed waiver flow, including the child and parent signature details that should appear in the final document.
- Verify a newly created child appears in the profile child list without requiring a manual page refresh.
- Verify child deletion shows the expected confirmation modal content, including the correct child name.
- Verify canceling child deletion leaves the child visible and unchanged.
- Verify confirming child deletion removes the child from the profile list and prevents stale child details from remaining visible after refresh.
- Verify a parent can add another child successfully when the account already has existing children.
