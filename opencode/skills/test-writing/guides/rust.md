# Rust Testing Guide

## Test Framework

Use the built-in test framework. It ships with Rust and requires no external
dependencies for unit tests. Run tests with `cargo test`. Use `cargo test
-- --nocapture` to see println output during test development.

Use `cargo-nextest` as a drop-in replacement runner for faster parallel
execution and better output formatting. It runs the same tests with no code
changes.

## Test Organization

Rust has two distinct test categories with different placement:

**Unit tests** live in the same file as the code they test, inside a
`#[cfg(test)]` module at the bottom of the file. This is the convention, not
a suggestion. The `#[cfg(test)]` attribute ensures test code is excluded from
release builds.

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn expired_user_cannot_access_premium() {
        // ...
    }
}
```

**Integration tests** live in a top-level `tests/` directory. Each file in
`tests/` is compiled as a separate crate. This means integration tests can
only access the public API of your crate. Use this to validate that the
public interface works correctly.

Shared test utilities go in `tests/common/mod.rs` (not `tests/common.rs`,
which would be treated as a test file itself).

## Assertions

- Use `assert!`, `assert_eq!`, and `assert_ne!` from std.
- Add descriptive messages to assertions: `assert!(result.is_ok(), "parsing
  valid input should succeed, got: {result:?}")`.
- For complex assertions, use the `pretty_assertions` crate for readable diffs
  on `assert_eq!` failures.
- Use `assert!(matches!(value, Pattern))` or the `matches!` macro for enum
  variant checking.

## Error Handling in Tests

- Test functions can return `Result<(), E>` to use `?` for setup steps. The
  test fails if the `Result` is `Err`.
- Use `#[should_panic(expected = "message")]` sparingly. Prefer returning
  `Result` and matching on the error type and content explicitly.
- For testing `Result`-returning functions, assert on both `Ok` and `Err`
  variants with specific value checks.

```rust
#[test]
fn rejects_negative_amount() {
    let result = process_payment(-50);
    assert!(result.is_err());
    assert!(matches!(result, Err(PaymentError::InvalidAmount(_))));
}
```

## Mocking and Test Doubles

Rust's type system and trait-based design make dependency injection the
natural approach.

- Define traits for external dependencies. Accept `impl Trait` or generic
  parameters in functions and structs.
- In tests, create stub implementations of the trait. These are plain structs
  that implement the trait with hardcoded or configurable return values.
- Use `mockall` when you need to verify call arguments or sequencing. Prefer
  simple stubs when you only need to control return values.
- Do not mock concrete types. If you cannot test something without mocking
  a concrete type, introduce a trait boundary.

## Test Data

- Use builder patterns for complex test data. Rust's type system makes
  factories less common than in dynamic languages.
- For tests that need filesystem state, use `tempfile::TempDir` for automatic
  cleanup.
- For tests that need deterministic randomness, accept a seed or RNG as a
  parameter.

## Async Tests

- Use `#[tokio::test]` for async test functions when using Tokio.
- Use `#[tokio::test(flavor = "multi_thread")]` when the test exercises
  concurrent behavior.
- For timeout-sensitive tests, use `tokio::time::pause()` to control time
  deterministically.

## Concurrency and Thread Safety

- The default test runner runs tests in parallel within each test binary.
  Ensure tests do not share mutable state via globals or the filesystem.
- If tests must share state (e.g., a port, a temp directory), use
  `std::sync::Once`, a mutex, or run them serially with `cargo test --
  --test-threads=1`.
- Prefer restructuring tests to eliminate shared state over serializing them.

## Common Anti-Patterns

- **Testing private functions directly**: Unit tests in `#[cfg(test)]` have
  access to private items via `use super::*`. Use this for complex internal
  logic, but prefer testing through the public API when possible. If private
  functions are complex enough to need direct testing, consider whether they
  should be extracted into a separate module with a public API.
- **Ignoring compiler warnings in tests**: `#[allow(unused)]` in test modules
  hides real problems. Fix the warnings.
- **Large integration tests that test everything**: Each integration test file
  should focus on one aspect of the public API. A single file exercising the
  entire crate is not meaningfully different from no integration tests.
- **Relying on test execution order**: Tests run in parallel by default. Any
  assumption about ordering is a latent bug.
