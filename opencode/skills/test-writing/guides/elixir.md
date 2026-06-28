# Elixir Testing Guide

## Test Framework

Use ExUnit. Run tests with `mix test`. Use `mix test --stale` during development
to run only tests affected by recent changes.

## Test Organization

- Test files live in `test/` mirroring the `lib/` structure.
- Naming: `test/<path>/<module>_test.exs` for `lib/<path>/<module>.ex`.
- Use `describe` blocks grouped by function and arity: `describe "create_user/1"`.

## Mocking

The Elixir community strongly prefers explicit dependency injection over mocking libraries.

- Define a behaviour for the dependency.
- Accept the implementation as a function argument or read from application config.
- In tests, pass a stub module or use `Mox` to define a mock implementing the behaviour.
- Use `Mox` when you need to verify call arguments. Use simple stubs when you only need controlled return values.
- Do not use global/process-based mocking. If the design requires mocking a module you do not own, introduce an interface boundary.

## Doctests

Use doctests for pure functions where the documentation example doubles as a
useful test. Do not use doctests as a replacement for ExUnit tests. If the
example would be contrived or hard to read, write a regular test instead.

## Ecto and Database Tests

- Use `Ecto.Adapters.SQL.Sandbox` for isolation. Each test gets a checked-out
  connection in a rolled-back transaction.
- Use factories (`ex_machina` or hand-rolled) for test data. Avoid fixtures
  and seed files in unit tests.
- Set `async: true` on test modules that do not share database state beyond
  their sandbox checkout.

## Property-Based Testing

Use `StreamData` via `ExUnitProperties` for:

- Functions with broad input domains (parsers, serializers, transformers)
- Encoding/decoding roundtrips
- Invariants that must hold across all inputs

Property tests complement example-based tests. Do not use them as a substitute.

## Umbrella Applications

Umbrella apps have independent test suites per child app.

### Running Tests

- `mix test` from the umbrella root runs all child app tests.
- `mix test` from within a child app (`apps/my_app/`) runs only that app's
  tests.
- Use the root-level command in CI. Use the child-level command during
  development for faster feedback.

### Test Isolation

- Each child app has its own `test/` directory, `test_helper.exs`, and
  test support modules.
- Tests in one child app should not reach into another child app's internals.
  If `app_a` depends on `app_b`, `app_a`'s tests call `app_b`'s public API,
  not its internal modules.
- If multiple apps share an Ecto repo, configure the sandbox in the app
  that owns the repo and have other apps reference that configuration.

### Shared Test Utilities

- Place shared factories and fixtures in the app that owns the data layer.
- Other apps reference them via `Code.require_file` in their `test_helper.exs`
  or through a shared test support dependency.
- Do not duplicate factory definitions across child apps.

## Common Anti-Patterns

- **Testing contexts through controllers**: Test context functions directly. Controllers are thin routing layers.
- **Shared database seeds in `test_helper.exs`**: Use per-test setup. Shared seeds create hidden coupling between tests.
- **Hardcoded timeouts in `assert_receive`**: Use the timeout parameter, and investigate why the message is slow.
- **String-matching error messages**: Match on error tuples and structured data, not display strings that change.
