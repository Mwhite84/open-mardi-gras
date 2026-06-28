---
name: test-writing
description: >
  Language and framework specific testing guidance that complements
  the tester agent's core philosophy. Contains ecosystem guides with community
  conventions, preferred test libraries, mocking strategies, and opinionated
  patterns. Use this skill whenever writing, reviewing, or planning tests.
  Trigger on: writing new tests, reviewing test quality, improving coverage,
  debugging flaky tests, setting up test infrastructure, or evaluating test
  suite confidence.
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

## When No Guide Exists

1. Inform the user that no guide exists for this ecosystem.
2. Rely on the universal testing principles you already hold.
3. Follow local conventions visible in the existing test suite.
