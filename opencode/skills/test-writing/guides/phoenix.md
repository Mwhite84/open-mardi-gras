# Phoenix Testing Guide

Load this guide alongside `elixir.md`. The Elixir guide covers ExUnit, Ecto
sandbox, and mocking conventions. This guide covers Phoenix-specific patterns.

## Test Organization

Phoenix generators create a `test/` structure mirroring `lib/`. Follow it:

- `test/<app>_web/controllers/` for controller tests
- `test/<app>_web/live/` for LiveView tests
- `test/<app>_web/channels/` for channel tests
- `test/support/` for shared test helpers, fixtures, and `ConnCase`/`DataCase`

Keep context (domain logic) tests separate from web layer tests. Context tests
use `DataCase`. Web layer tests use `ConnCase` or `ChannelCase`.

## ConnTest

Use `Phoenix.ConnTest` (via `ConnCase`) for controller and request-level
testing.

- Build requests using the `conn` pipeline: `build_conn() |> put_req_header(...)
  |> get(~p"/path")`.
- Assert on response status, body content, and redirects. Do not assert on
  internal controller state or assigns unless testing a specific assign.
- Use route helpers or verified routes (`~p"/users/#{user}"`) in tests. Do not
  hardcode URL strings.
- For authenticated routes, create a shared setup helper that signs in a user
  through the real authentication path (session, token), not by manually
  stuffing assigns.

```elixir
setup %{conn: conn} do
  user = user_fixture()
  conn = log_in_user(conn, user)
  %{conn: conn, user: user}
end

test "authenticated user sees dashboard", %{conn: conn} do
  conn = get(conn, ~p"/dashboard")
  assert html_response(conn, 200) =~ "Welcome"
end
```

## Testing Contexts

Test context modules directly, not through controllers. Contexts contain
your business logic. Controllers are thin routing layers.

- Use `DataCase` for context tests. It handles Ecto sandbox checkout.
- Test the public functions of each context module: creation, retrieval,
  validation, authorization checks.
- Test both success and error return values. Contexts should return
  `{:ok, result}` / `{:error, changeset}` tuples. Assert on both branches.
- Test changeset validations directly when the validation logic is complex:
  `assert %{email: ["is required"]} = errors_on(changeset)`.

## LiveView Testing

Use `Phoenix.LiveViewTest` for LiveView tests.

- Mount the LiveView with `live(conn, ~p"/path")` and interact through the
  test API. Do not test LiveView by inspecting internal assigns or socket state.
- Test the full interaction cycle: mount, render, user action, updated render.
- Use `render_click/2`, `render_submit/2`, `render_change/2` for user
  interactions. Assert on the returned HTML.
- For LiveView components, test them through the parent LiveView when possible.
  Use `render_component/2` only for truly standalone components.
- Test `handle_event`, `handle_info`, and `handle_params` through the user
  actions that trigger them, not by calling the callbacks directly.

```elixir
test "toggling filter updates results", %{conn: conn} do
  {:ok, view, _html} = live(conn, ~p"/products")

  html = view
    |> element("#filter-active")
    |> render_click()

  assert html =~ "Active products"
  refute html =~ "Archived"
end
```

### LiveView Async Patterns

- For LiveViews that load data asynchronously with `assign_async` or
  `start_async`, assert on the loading state first, then use
  `assert_async_mount` or wait for the update message.
- Do not use `Process.sleep` to wait for async results. Use
  `render_async/1` to flush async assigns, or assert on the update
  using pattern matching on the rendered output.

## Channel Testing

Use `Phoenix.ChannelTest` (via `ChannelCase`) for WebSocket channel tests.

- Subscribe and join through `subscribe_and_join/3`.
- Use `push/3` to send events and `assert_broadcast/2`, `assert_push/2`,
  or `assert_reply/2` to verify responses.
- Test authorization in the `join/3` callback: verify that unauthorized
  users receive `{:error, reason}`.

## PubSub in Tests

- Use `Phoenix.PubSub.subscribe` in tests when verifying that an action
  broadcasts a message.
- Assert with `assert_receive` and pattern match on the message structure.
- Keep PubSub topic names consistent between production code and tests.
  Extract them into a shared module or function if needed.

## Testing Plugs

- Test custom plugs in isolation by building a conn, running it through
  the plug, and asserting on the output conn.
- For authentication/authorization plugs, test both the allowed and
  rejected paths.

## Umbrella Applications

Phoenix umbrella apps typically split into a core app (`my_app` with contexts
and Ecto) and a web app (`my_app_web` with controllers, LiveView, channels).

### Test Boundary Discipline

- `my_app` tests use `DataCase` and test contexts, schemas, and business logic
  in isolation. They should never reference `MyAppWeb` modules.
- `my_app_web` tests use `ConnCase` and test the web layer. They depend on
  `my_app` for data setup (factories, fixtures) but test through HTTP and
  LiveView interfaces.
- Do not test business logic through controllers just because it is
  convenient. If a test in `my_app_web` is really testing a context function,
  move it to `my_app`.

### Shared Test Support

- Place factories and shared fixtures in `my_app/test/support/` since the
  core app owns the data layer.
- `my_app_web` accesses these through the umbrella dependency. Add
  `my_app` test support to the web app's test helper:

```elixir
# my_app_web/test/test_helper.exs
Code.require_file("../../my_app/test/support/fixtures.ex", __DIR__)
```

### Database Setup

- The Ecto repo lives in `my_app`. Configure sandbox mode there.
- `my_app_web` tests share the sandbox through the `:shared` mode or
  by checking out the repo in `ConnCase` setup. Phoenix generators
  handle this, but verify the setup if tests show database contention.

## Common Anti-Patterns

- **Testing contexts through controllers**: The most common Phoenix testing
  mistake. Context tests are faster, more focused, and independent of HTTP.
- **Asserting on HTML structure instead of content**: `assert html =~ "Welcome"`
  is resilient. `assert html =~ "<div class=\"header\"><h1>Welcome</h1></div>"`
  breaks on every markup change.
- **Manual session/cookie manipulation for auth**: Build a `log_in_user/2`
  helper that uses the real auth flow. Manual session stuffing skips the
  auth logic you should be testing.
- **Skipping error/edge case tests for LiveView**: LiveView error handling
  (disconnects, stale sockets, race conditions on concurrent events) is
  where production bugs live. Test `handle_info` with unexpected messages
  and verify the LiveView recovers gracefully.
