---
name: test-writing
description: >
  Language and framework specific testing guidance that complements
  the tester agent's core philosophy. Contains ecosystem guides with community
  conventions, preferred test libraries, mocking strategies, and opinionated
  patterns. Use this skill whenever writing, reviewing, or planning tests.
  Trigger on: writing new tests, reviewing test quality, improving coverage,
  debugging flaky tests, setting up test infrastructure, evaluating test
  suite confidence, or, in the OMG workflow, working a dispatched test bead
  (stamping a run-selector, leaving a bead terminal).
version: 0.1.0
---
# Testing Skill

Provides ecosystem-specific testing guidance via the `guides/` directory:
community conventions, preferred test libraries, mocking strategies, and
opinionated patterns for a given language or framework. This skill carries the
ecosystem-specific *how*; it does not restate universal testing principles.

## Skill Base Directory

When this skill is loaded, the base directory is provided in the tool output.
All guide paths below are relative to that base directory. Use the Read tool
to load guide files.

## Available Guides

### Language Guides

| Guide           | File                      | Use when working with                     |
|-----------------|---------------------------|-------------------------------------------|
| Elixir          | `guides/elixir.md`        | ExUnit, Ecto, OTP applications            |
| TypeScript      | `guides/typescript.md`    | Vitest, Jest, Node/Bun projects           |
| Python          | `guides/python.md`        | pytest, Python packages and services      |
| Rust            | `guides/rust.md`          | cargo test, Rust crates and binaries      |

### Framework Guides

| Guide           | File                      | Load alongside       |
|-----------------|---------------------------|----------------------|
| Phoenix         | `guides/phoenix.md`       | `elixir.md`          |
| Frontend (DOM)  | `guides/frontend.md`      | The relevant language guide |

Framework guides supplement language guides. Always load both.

## Loading Guides

1. Identify the language(s) and frameworks from file extensions, build files
   (`mix.exs`, `package.json`, `pyproject.toml`, `Cargo.toml`), and existing
   test files in the project.
2. Read the matching language guide:
   `Read <base-directory>/guides/<language>.md`
3. If a framework guide applies, read it too:
   `Read <base-directory>/guides/<framework>.md`
4. Load only guides relevant to the code you are currently working on. In a
   multi-language codebase, do not load all guides at once.

### Example: Phoenix Application

A Phoenix app with a TypeScript frontend:
- Working on Elixir context modules: read `guides/elixir.md`
- Working on LiveView or controllers: read `guides/elixir.md` + `guides/phoenix.md`
- Working on the JS frontend: read `guides/typescript.md` + `guides/frontend.md`

## The run-selector for a test you authored

In the OMG workflow you stamp a **run-selector** onto each test bead after writing
its test — the concrete, runnable identifier that runs *exactly* that test and
nothing else. Its form is ecosystem-specific, and the guide for your stack is where
to confirm it: it is the file path plus whatever name/filter the runner accepts to
target a single test (for example, an ExUnit `path:line`, a pytest
`path::Class::test_name` node id, a Vitest/Jest `-t "<name>"` filter, a `cargo test
<module>::<name>` path). Prefer the tightest selector the runner supports, so the
implementer's focused done-check runs only this test. When a guide names the
idiomatic single-test invocation for its stack, use that form for the selector.

## Working a dispatched test bead (OMG workflow)

When the foreman dispatches you onto a test bead — one planned at decomposition,
a re-planned replacement for a test a builder was stuck on, or an update to a
stale prior-epic test — follow this procedure. It applies to all three **alike**.

### 1. Write the test the bead's wiring intends

Honor the bead's wiring, do not re-decide scope:

- **Your test bead blocks an implementation bead** (the code does not exist
  yet): write the **failing** test. It must fail red until the implementer's
  code makes it pass — that red is the point of ordering the test first.
- **An implementation bead blocks your test bead** (the code already exists):
  author and run the **post-fix** test, confirming it passes against the
  existing code.

### 2. Stamp the run-selector onto the bead (the second metadata hop)

Once the test exists, write its concrete run-selector (the form above) onto the
test bead. You are the only agent that can: the build planner could not pre-commit
it at plan time because the test did not exist yet. The selector is the target the
implementer later runs to prove its code is done, resolved through bead metadata
without ever reading your test's source (so it survives an eventual read-deny on
the test directory).

The `bd` write itself lives in `omg-commands` §"Bead metadata" — reach for it for
the authoritative form (`bd update <bead> --set-metadata
"run_selector=<file>:<name-or-filter>"`). Stamp it for all three kinds of test
bead alike; a bead closed without its `run_selector` costs the implementer its
focused fast path.

### 3. Leave the bead terminal (the dispatch-lifecycle contract)

The foreman holds no state, so before you return control you leave your test
bead in **exactly one** of two states, never `in_progress` and never
reopened-unblocked:

- **Closed** — you authored the test and stamped its selector. Success.
- **Reopened and blocked** — you could not finish. File a bead naming the blocker,
  wire it to **block** yours (`bd dep add <your-bead> <blocker-bead>`), reset yours
  to the queue (`bd update <your-bead> --status open --assignee ""`), and stop. A
  dispatch is a single turn; you finish or you file-and-block — you never hand a
  half-written bead back expecting a nudge.

### 4. Recovery: a bead carrying a reclamation comment

If you are dispatched onto a bead carrying a **reclamation comment** (a prior worker
was interrupted mid-write and the foreman handed you the bead fresh), first check
whether the test was **already authored** — the prior worker may have finished the
work but died before closing. If it was, close the bead (stamping the selector per
step 2 if it is missing). Otherwise pick up the partial work and carry it to a clean
terminal state per steps 1–3.

## When No Guide Exists

1. Inform the user that no guide exists for this ecosystem.
2. Rely on the universal testing principles you already hold.
3. Follow local conventions visible in the existing test suite.
