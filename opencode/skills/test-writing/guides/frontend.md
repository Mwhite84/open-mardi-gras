# Frontend Testing Guide

This guide covers universal frontend testing principles that apply across
frameworks. Load it alongside the relevant framework guide (e.g., `react.md`,
`phoenix.md`) and the base language guide.

## Core Principle

Test what the user experiences, not how the component is implemented. If a
refactor changes the internal structure but the user sees the same behavior,
no tests should break.

## Selecting Elements

- Query by accessible role, label, or text content. These reflect what the
  user sees and interacts with.
- Do not query by CSS class, element ID, or component internal state. These
  are implementation details that change during refactors.
- Use `data-testid` attributes as a last resort when no accessible selector
  exists. Prefer fixing the accessibility over adding test IDs.
- Preferred query priority: `getByRole` > `getByLabelText` > `getByText` >
  `getByTestId`.

## User Interaction

- Simulate user actions (click, type, select), not programmatic state changes.
  Call the click handler by simulating a click, not by invoking the callback
  directly.
- Test complete user flows: "user fills form, submits, sees confirmation"
  not "onChange updates state, onSubmit calls API, render shows message" as
  three separate tests.
- For keyboard navigation and accessibility, test that focus moves correctly
  and that keyboard shortcuts work.

## Async and Loading States

- Use `waitFor` or equivalent polling utilities for async UI updates. Do not
  use fixed-time delays.
- Test loading states, error states, and empty states explicitly. These are
  states the user sees and are common sources of bugs.
- Assert that loading indicators appear AND disappear.

## What Not to Test in the Frontend

- **CSS and visual styling**: Do not assert on class names, inline styles,
  or computed styles. Use visual regression tools (Chromatic, Percy,
  Playwright screenshots) for visual correctness.
- **Internal component state**: Do not inspect state variables directly. Test
  the output the state produces.
- **Third-party component internals**: If you use a date picker library, test
  that selecting a date produces the correct value in your form. Do not test
  that the date picker renders its calendar correctly.

## API Boundary

- Mock HTTP requests at the network level (MSW, `nock`, or similar), not by
  mocking fetch/axios directly. Network-level mocking catches more integration
  issues.
- Define response fixtures that match the real API contract. Keep them in sync
  with the actual API schema when possible.
- Test error responses and network failures, not just successful responses.

## Common Anti-Patterns

- **Shallow rendering**: Renders a component without its children, testing
  an abstraction that no user ever sees. Render fully.
- **Snapshot tests for UI components**: They fail on every visual change and
  get auto-updated without review. Use explicit assertions on behavior.
- **Testing implementation hooks directly**: `renderHook` has its uses, but
  if the hook is only used in one component, test the component instead.
- **Asserting on DOM structure**: Checking that a `<div>` contains a `<span>`
  containing a `<p>` is testing HTML structure, not behavior. Assert on
  visible text and user-facing state.
