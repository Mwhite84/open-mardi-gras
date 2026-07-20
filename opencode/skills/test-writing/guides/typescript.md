# TypeScript Testing Guide

## Test Framework

Use Vitest for new projects. It is fast, ESM-native, and has first-class
TypeScript support without separate compilation. Use Jest only in existing
codebases already committed to it.

Run tests with `npx vitest` (watch mode) or `npx vitest run` (single pass).

## Test Organization

- Test files live colocated with source files as `<module>.test.ts` or in a
  parallel `__tests__/` directory. Colocated is preferred for discoverability.
- Name test files after the module they test: `parseConfig.test.ts` for
  `parseConfig.ts`.
- Use `describe` blocks for grouping by function or behavior. Use `it` or `test`
  for individual cases.

## Type Safety in Tests

- Do not use `as any` to silence type errors in test setup. If the type system
  is fighting you, the test setup is wrong or the interface needs adjustment.
- Use `satisfies` or explicit typing for test fixtures to catch stale test data
  when interfaces change.
- Create factory functions that return properly typed test data rather than
  inline object literals repeated across tests.

```typescript
// Prefer this
function buildUser(overrides?: Partial<User>): User {
  return { id: "1", name: "test", email: "test@example.com", ...overrides };
}

// Over this
const user = { id: "1", name: "test", email: "test@example.com" } as User;
```

## Mocking

- Prefer dependency injection over module mocking. Accept dependencies as
  parameters or via a context/container pattern.
- When module mocking is necessary, use `vi.mock()` (Vitest) or `jest.mock()`.
  Mock at the boundary (HTTP clients, file system, database), not between your
  own modules.
- Use `vi.spyOn()` when you need to observe calls but keep the real
  implementation.
- Reset mocks between tests with `afterEach(() => vi.restoreAllMocks())`.
- Do not mock what you do not own unless behind an interface you control.

## Async Patterns

- Always `await` async operations in tests. An unhandled promise rejection
  is a silent test failure.
- Use `vi.useFakeTimers()` for time-dependent code. Advance explicitly with
  `vi.advanceTimersByTime()` rather than real waits.
- For event-driven code, use `waitFor` utilities (from testing-library or
  similar) rather than arbitrary `setTimeout` delays.

## Assertions

- Use `expect()` with specific matchers: `toEqual` for deep equality,
  `toBe` for reference/primitive identity, `toMatchObject` for partial matching.
- Prefer `toThrow` or `rejects.toThrow` for error assertions over try/catch
  blocks in tests.
- Avoid `toBeTruthy`/`toBeFalsy` when a more specific matcher exists. They
  hide the actual failure.

## Common Anti-Patterns

- **Importing test utilities from `node_modules` internals**: These are
  unstable paths. Use the public API.
- **Testing type narrowing at runtime**: If TypeScript compiles it, the
  narrowing works. Test the behavior after narrowing, not the narrowing itself.
- **Snapshot tests for object output**: Use explicit assertions. Snapshots
  hide what matters and auto-update encourages rubber-stamping changes.
- **Mocking the module under test**: If you are mocking parts of the same
  module you are testing, restructure the code.
