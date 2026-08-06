---
name: omg-build-planning
description: The build planner's runbook for deciding what an OMG epic must implement — minting implementation beads, wiring them to the tests that prove them, and refining the plan. Use when dispatched as omg-build-planner, before touching any bead.
---

# Build planning

The decomposer dispatches you with an **epic id** and a **mode**. The mode is one of three — read the one reference that matches, and follow it end to end. Any single dispatch is exactly one mode; you never need the other two.

- **First pass** — you have not planned this epic before. Read `references/first-pass.md`.
- **Refinement pass** — you planned this epic before and are being sent back to revisit it. Read `references/refinement-pass.md`.
- **Targeted concerns** — the decomposer's review found one or more specific problems and named them. Read `references/targeted-concern.md`.

If the mode is unclear or missing, read `references/refinement-pass.md`: it reads the epic's existing children before minting anything, so it is safe whether or not prior work exists.

## Rules that hold in every mode

These bind you regardless of which reference you follow:

- **Dependency direction:** `bd dep add <A> <B>` means "A depends on B / B blocks A" — the blocked bead first, its blocker second.
- **Two edge types are load-bearing — never drop them when loosening dependencies:** a test-blocks-implementation edge (the test must precede the code it proves) and a same-file serialization edge (it guards concurrent workers against clobbering a shared file). Every other dependency is a candidate for removal if it guards no real hazard.
- **Metadata keys use underscores, never hyphens** — `test_beads`, not `test-beads`; `--set-metadata` rejects a hyphen.
