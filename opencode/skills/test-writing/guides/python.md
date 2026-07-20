# Python Testing Guide

## Test Framework

Use pytest. It is the de facto standard. Do not use `unittest` for new code
unless the project is already committed to it. pytest runs `unittest`-style
tests natively, so migration is incremental.

Run tests with `pytest`. Use `pytest -x` to stop on first failure during
development. Use `pytest --lf` to rerun only tests that failed last time.

## Test Organization

- Test files live in a `tests/` directory mirroring the `src/` or package
  structure.
- Naming: `tests/test_<module>.py` for `src/<module>.py`.
- Use classes sparingly and only for grouping related tests that share setup.
  Prefer top-level functions: `def test_expired_user_cannot_access():`.

## Fixtures

- Use `@pytest.fixture` for test setup. Fixtures compose well and make
  dependencies explicit.
- Scope fixtures appropriately: `function` (default) for per-test isolation,
  `module` or `session` for expensive setup that is safe to share (database
  connections, compiled artifacts).
- Use `yield` fixtures for setup/teardown in a single function.
- Prefer fixtures over `setUp`/`tearDown` methods. They are more composable
  and their dependency graph is explicit.

```python
@pytest.fixture
def db_connection():
    conn = create_connection()
    yield conn
    conn.close()

@pytest.fixture
def user(db_connection):
    return create_user(db_connection, name="test")
```

## Parametrize

Use `@pytest.mark.parametrize` to test multiple inputs against the same logic.
Each parameter set should test a meaningfully different case, not just
variations of the happy path.

```python
@pytest.mark.parametrize("input,expected", [
    ("valid@email.com", True),
    ("no-at-sign", False),
    ("", False),
    ("user@.com", False),
])
def test_email_validation(input, expected):
    assert validate_email(input) == expected
```

Do not parametrize when the test logic differs significantly between cases.
Write separate tests instead.

## Mocking

- Use `unittest.mock.patch` for mocking external boundaries (HTTP calls, file
  I/O, environment variables).
- Prefer dependency injection over `patch` when possible. Pass collaborators
  as arguments rather than patching module-level imports.
- Use `patch` as a context manager or decorator, not `patch.start()`/`stop()`.
  Context managers guarantee cleanup.
- Mock at the point of use, not the point of definition:
  `patch("mymodule.requests.get")` not `patch("requests.get")`.

## Assertions

- Use plain `assert` statements. pytest introspects them and provides detailed
  failure output.
- Use `pytest.raises` for exception assertions. Check the exception type and
  message content.
- Use `pytest.approx` for floating point comparisons.
- Do not use `assertEqual`, `assertTrue`, or other unittest-style assertions
  in pytest tests.

## Async

- Use `pytest-asyncio` for testing async code. Mark async tests with
  `@pytest.mark.asyncio`.
- Use `asyncio` mode `auto` in `pyproject.toml` to avoid marking every
  async test individually.

## Common Anti-Patterns

- **Patching everything**: If a function requires five patches to test, the
  function has too many dependencies. Restructure the code.
- **Fixtures that do too much**: A fixture that creates a user, three projects,
  and seeds configuration is a test data junk drawer. Break it into composable
  pieces.
- **Asserting on mock call counts without asserting on arguments**: Knowing
  a function was called twice means nothing if you do not verify what it was
  called with.
- **Ignoring warnings in tests**: Use `pytest.warns` or `filterwarnings` to
  handle them explicitly. Suppressed warnings hide real problems.
